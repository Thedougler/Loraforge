import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_upload_dataset_success():
    """
    Tests that a file can be successfully uploaded to the /datasets/upload endpoint.
    """
    # Create a dummy file in memory
    file_content = b"dummy file content for testing"
    file_to_upload = ("test_dataset.zip", io.BytesIO(file_content), "application/zip")

    # Use the TestClient to send a POST request
    response = client.post(
        "/datasets/upload",
        files={"file": file_to_upload}
    )

    # This test is designed to reproduce a 404, but we expect it to pass (200 OK)
    # because the endpoint exists. A passing test proves the application code is correct,
    # and the 404 error originates from the deployment/network configuration.
    assert response.status_code != 404
    assert response.status_code == 200
    response_json = response.json()
    assert response_json["status"] == "success"
    assert "task_id" in response_json