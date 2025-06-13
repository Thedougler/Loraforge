import pytest
from fastapi.testclient import TestClient
from app.main import app
from datetime import datetime
import io
import zipfile

client = TestClient(app)

import time
from app.models import TaskStatus, BackgroundTaskResponse

@pytest.fixture(scope="module", autouse=True)
def wait_for_app():
    # Wait for the app to start and create tables
    time.sleep(5)

def create_dummy_zip(files_to_add={"dummy.txt": b"some content"}):
    """Creates an in-memory zip file with dummy content."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for filename, content in files_to_add.items():
            zip_file.writestr(filename, content)
    zip_buffer.seek(0)
    return zip_buffer.getvalue()

def test_upload_dataset_and_verify_response():
    test_file_content = create_dummy_zip()
    test_file_name = "test_dataset.zip"
    dataset_name = "My Test Dataset"

    response = client.post(
        "/v1/datasets/",
        files={"file": (test_file_name, test_file_content, "application/zip")},
        data={"name": dataset_name}
    )

    assert response.status_code == 202
    task_response = BackgroundTaskResponse(**response.json())
    assert task_response.task_name == "process_dataset_upload"
    assert task_response.status == TaskStatus.PENDING
    assert isinstance(task_response.created_at, datetime)
    assert isinstance(task_response.updated_at, datetime)

def test_upload_dataset_async():
    test_file_content = create_dummy_zip()
    test_file_name = "async_test_dataset.zip"
    dataset_name = "My Async Test Dataset"

    response = client.post(
        "/v1/datasets/",
        files={"file": (test_file_name, test_file_content, "application/zip")},
        data={"name": dataset_name}
    )

    assert response.status_code == 202
    task_response = BackgroundTaskResponse(**response.json())
    assert task_response.task_name == "process_dataset_upload"
    assert task_response.status == TaskStatus.PENDING # Initial status should be PENDING

    # Simulate polling the status endpoint
    task_id = task_response.id
    for _ in range(30): # Poll for up to 30 seconds (adjust as needed)
        status_response = client.get(f"/v1/tasks/{task_id}/status")
        assert status_response.status_code == 200
        current_task_status = BackgroundTaskResponse(**status_response.json())
        
        print(f"Task {task_id} status: {current_task_status.status}, Progress: {current_task_status.progress}%")
        
        if current_task_status.status == TaskStatus.SUCCESS:
            break
        elif current_task_status.status == TaskStatus.FAILURE:
            pytest.fail(f"Task failed: {current_task_status.result}")
        time.sleep(1) # Wait for 1 second before polling again
    else:
        pytest.fail(f"Task did not complete within the expected time. Final status: {current_task_status.status}, Result: {current_task_status.result}")

    assert current_task_status.status == TaskStatus.SUCCESS
    assert current_task_status.progress == 100
    assert "processed successfully." in current_task_status.result

def test_get_all_datasets_after_async_upload():
    # Helper to upload dataset and wait for completion
    def upload_and_wait(dataset_name_prefix, file_suffix):
        test_file_content = create_dummy_zip()
        test_file_name = f"{dataset_name_prefix}_{file_suffix}.zip"
        dataset_name = f"{dataset_name_prefix} Dataset"

        response = client.post(
            "/v1/datasets/",
            files={"file": (test_file_name, test_file_content, "application/zip")},
            data={"name": dataset_name}
        )
        assert response.status_code == 202
        task_response = BackgroundTaskResponse(**response.json())
        task_id = task_response.id

        for _ in range(30):
            status_response = client.get(f"/v1/tasks/{task_id}/status")
            assert status_response.status_code == 200
            current_task_status = BackgroundTaskResponse(**status_response.json())
            if current_task_status.status == TaskStatus.SUCCESS:
                # Need to retrieve the actual Dataset ID after worker processing
                # This would typically be part of the task result or a separate query
                # For now, it's mocked by a direct DB query, mimicking the previous test setup
                from app.models import get_db, Dataset
                db = next(get_db())
                db_dataset = db.query(Dataset).filter(Dataset.name == dataset_name).first()
                db.close()
                assert db_dataset is not None
                return str(db_dataset.id), dataset_name
            elif current_task_status.status == TaskStatus.FAILURE:
                pytest.fail(f"Task failed during setup: {current_task_status.result}")
            time.sleep(1)
        pytest.fail(f"Setup task did not complete within expected time for {dataset_name}. Final status: {current_task_status.status}")

    dataset_id_1, dataset_name_1 = upload_and_wait("First", "1")
    dataset_id_2, dataset_name_2 = upload_and_wait("Second", "2")

    # Now make a GET request to retrieve all datasets
    get_response = client.get("/v1/datasets/")

    assert get_response.status_code == 200
    data = get_response.json()
    assert isinstance(data, list)
    assert len(data) >= 2 # At least the two we just added

    # Verify that the created datasets are in the response
    found_dataset_1 = False
    found_dataset_2 = False
    for dataset in data:
        if dataset.get("id") == dataset_id_1 and dataset.get("name") == dataset_name_1:
            found_dataset_1 = True
        if dataset.get("id") == dataset_id_2 and dataset.get("name") == dataset_name_2:
            found_dataset_2 = True
    
    assert found_dataset_1
    assert found_dataset_2

def test_get_images_for_dataset_after_async_upload():
    # Helper to upload dataset and wait for completion to get dataset_id
    def upload_and_wait_for_dataset_id(dataset_name_param):
        test_file_content_images = create_dummy_zip({
            "image1.jpg": b"fake image data",
            "image2.png": b"fake image data too"
        })
        zip_file_name = "test_dataset_with_images.zip"

        response = client.post(
            "/v1/datasets/",
            files={"file": (zip_file_name, test_file_content_images, "application/zip")},
            data={"name": dataset_name_param}
        )
        assert response.status_code == 202
        task_response = BackgroundTaskResponse(**response.json())
        task_id = task_response.id

        for _ in range(30):
            status_response = client.get(f"/v1/tasks/{task_id}/status")
            assert status_response.status_code == 200
            current_task_status = BackgroundTaskResponse(**status_response.json())
            
            if current_task_status.status == TaskStatus.SUCCESS:
                from app.models import get_db, Dataset
                db = next(get_db())
                db_dataset = db.query(Dataset).filter(Dataset.name == dataset_name_param).first()
                db.close()
                assert db_dataset is not None
                return str(db_dataset.id)
            elif current_task_status.status == TaskStatus.FAILURE:
                pytest.fail(f"Task failed during image dataset setup: {current_task_status.result}")
            time.sleep(1)
        pytest.fail(f"Setup task did not complete within expected time for {dataset_name_param}. Final status: {current_task_status.status}")

    dataset_name = "Dataset With Images for Test"
    dataset_id = upload_and_wait_for_dataset_id(dataset_name)

    response = client.get(f"/v1/datasets/{dataset_id}/images/")

    assert response.status_code == 200

    images_data = response.json()
    assert isinstance(images_data, list)
    assert len(images_data) >= 2 # Assuming the dummy zip contained at least 2 image files

    assert any(img["filename"] == "image1.jpg" for img in images_data)
    assert any(img["filename"] == "image2.png" for img in images_data)
    
    first_image = images_data[0]
    assert "id" in first_image
    assert "dataset_id" in first_image
    assert "filename" in first_image
    assert "path" in first_image
    # Width and height might be None depending on the dummy zip content and image analysis capability
    assert "width" in first_image
    assert "height" in first_image