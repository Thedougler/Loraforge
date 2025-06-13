import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
import shutil
import uuid
from app.main import app, get_db, UPLOAD_DIR
from app.models import Base, Dataset, Image, BackgroundTask, TaskStatus
from app.worker import process_dataset_upload  # Directly import worker function for testing

# --- Setup for Test Database and File System ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_db.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(name="db_session")
def db_session_fixture():
    """Provides a transactional test database session."""
    Base.metadata.create_all(bind=engine)  # Create tables for the test database
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)  # Drop tables after test

@pytest.fixture(name="client")
def client_fixture(db_session):
    """Provides a test client for the FastAPI app with dependency override."""
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture(name="cleanup_uploads")
def cleanup_uploads_fixture():
    """Cleans up the upload directory before and after tests."""
    
    # Ensure UPLOAD_DIR exists before tests
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs("/data/datasets", exist_ok=True) # Ensure this exists too
    for folder_name in os.listdir("/data/datasets"):
        folder_path = os.path.join("/data/datasets", folder_name)
        if os.path.isdir(folder_path):
            shutil.rmtree(folder_path)

    yield
    # Clean up after tests
    if os.path.exists("/data/datasets"):
        for folder_name in os.listdir("/data/datasets"):
            folder_path = os.path.join("/data/datasets", folder_name)
            if os.path.isdir(folder_path):
                shutil.rmtree(folder_path)

    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
    os.makedirs(UPLOAD_DIR, exist_ok=True) # Recreate for subsequent tests if needed

@pytest.fixture(name="test_zip_file_path")
def test_zip_file_path_fixture():
    """Provides the path to the test zip file and skips the test if not found."""
    _path = "/app/tests/test_images.zip" # Corrected path
    if not os.path.exists(_path):
        pytest.skip(f"Test archive not found at {_path}. Ensure it's in the backend/tests/ directory on the host.")
    return _path

# --- E2E Test Case ---
def test_upload_dataset_and_fetch_images(client: TestClient, db_session: TestingSessionLocal, cleanup_uploads, test_zip_file_path: str):
    """
    Tests the end-to-end workflow of uploading a dataset, processing it via the worker (mocked),
    and fetching the image list via the API.
    """
    dataset_name = "Test Dataset"
    
    # Step 1: Upload the dataset archive
    with open(test_zip_file_path, "rb") as f:
        response = client.post(
            "/v1/datasets/",
            files={"file": (os.path.basename(test_zip_file_path), f, "application/zip")},
            data={"name": dataset_name}
        )
    
    assert response.status_code == 202
    task_response = response.json()
    task_id = task_response["id"]
    assert task_response["status"] == TaskStatus.PENDING.value
    assert task_response["task_name"] == "process_dataset_upload"

    # Step 2: Directly call the worker function (simulate Celery task execution)
    # We retrieve the task from the DB to get the `temp_file_path` and `original_filename` used by the API
    db_task = db_session.query(BackgroundTask).filter(BackgroundTask.id == uuid.UUID(task_id)).first()
    assert db_task is not None

    # Parse arguments from the task's result field, as they are not directly returned by the initial API call
    # In a real Celery setup, these args would be passed directly. Here, we're mimicking that.
    # For now, let's assume the temp_file_path is derived from UPLOAD_DIR and original_filename is known
    # Extract temp_file_path from the task result string
    # Example: "Processing dataset upload for 'Test Dataset' (filename: original.zip, temp_path: /data/uploads/some_uuid.zip)"
    temp_path_prefix = "temp_path: "
    if temp_path_prefix in db_task.result:
        start_index = db_task.result.find(temp_path_prefix) + len(temp_path_prefix)
        end_index = db_task.result.find(")", start_index) # This might need to be adjusted if ')' is not reliable
        if start_index != -1 and end_index != -1:
            actual_temp_file_path = db_task.result[start_index:end_index].strip()
        else:
            raise ValueError(f"Could not parse temp_path from task result: {db_task.result}")
    else:
        raise ValueError(f"temp_path not found in task result: {db_task.result}")

    worker_result = process_dataset_upload(
        task_id=task_id,
        temp_file_path=actual_temp_file_path,
        original_filename=os.path.basename(test_zip_file_path),
        dataset_name=dataset_name,
        db=db_session # Pass the test session
    )
    
    assert worker_result["status"] == "success"
    processed_dataset_id = worker_result["dataset_id"]

    # Step 3: Verify task status in DB
    updated_db_task = db_session.query(BackgroundTask).filter(BackgroundTask.id == uuid.UUID(task_id)).first()
    assert updated_db_task.status == TaskStatus.SUCCESS.value
    assert updated_db_task.progress == 100
    assert updated_db_task.result.startswith(f"Dataset '{dataset_name}' with ID {processed_dataset_id} processed successfully.")

    # Step 4: Fetch images for the processed dataset
    images_response = client.get(f"/v1/datasets/{processed_dataset_id}/images/")
    assert images_response.status_code == 200
    
    images_data = images_response.json()
    assert isinstance(images_data, list)
    assert len(images_data) > 0 # Expect at least one image

    # Assert basic structure of an image object and that 'path' is relative
    first_image = images_data[0]
    assert "id" in first_image
    assert "filename" in first_image
    assert "path" in first_image
    assert isinstance(first_image["path"], str)
    assert len(first_image["path"]) > 0 # Ensure the path is not empty
    
    # Test for the bug: attempt to fetch an image file via the expected but currently missing endpoint
    # This part is expected to fail or return an incorrect response until the backend is fixed
    # It demonstrates the current bug.
    image_id_from_response = first_image["id"]
    image_file_response = client.get(f"/v1/images/{image_id_from_response}/file") # Endpoint that PhotoGrid uses
    
    # After implementing the backend fix, this assertion should now pass (200 OK).
    assert image_file_response.status_code == 200
    assert image_file_response.headers["content-type"].startswith("image/") # Ensure it's an image content type