# Technical Plan: Resolve "Failed to Load Images" Error

## 1. Overview

The user is reporting that images are not displayed in the UI after a dataset is selected, showing a "Failed to load images for this dataset" error. The root cause appears to be a disconnect between how the frontend requests image data and what the backend API provides. The backend serves image *metadata* (like filenames and paths) but lacks an endpoint to serve the actual image *files*. Additionally, the frontend may not be correctly parsing the API response for the image list.

This plan outlines a test-driven approach to first reproduce the bug with automated tests, then implement the necessary fixes on both the backend and frontend, and finally verify the solution.

## 2. Data Flow & Architecture

The following diagram illustrates the intended data flow for displaying images. The key missing piece, which we will build, is the "Image File Request" flow.

```mermaid
graph TD
    subgraph Browser
        F1[React UI: Selects Dataset] --> F2{Redux: setActiveDataset};
        F2 --> F3[PhotoGrid: useEffect];
        F3 -- API Call --> B1;
        F3 --> F4[Render img src="/api/v1/images/..."];
    end

    subgraph Server
        B1[API: GET /v1/datasets/{id}/images/] --> DB[(PostgreSQL)];
        B2[API: GET /v1/images/{id}/file] --> FS[(File System)];
    end

    subgraph Worker
        W1[Celery: process_dataset_upload] --> W2[Unpack ZIP];
        W2 --> W3[Create DB Records];
        W3 --> DB;
        W2 --> FS;
    end

    F4 -- Image File Request --> B2;
    B1 -- Image List (Metadata) --> F3;
    B2 -- Image File (Binary) --> F4;

    style B2 fill:#f9f,stroke:#333,stroke-width:2px
    style F4 fill:#f9f,stroke:#333,stroke-width:2px
```

## 3. Identified Failure Points

1.  **Missing Backend Endpoint:** The frontend attempts to load images from a `/api/v1/images/{image_id}/data` URL (`frontend/src/components/PhotoGrid.jsx:76`), but this endpoint does not exist in the FastAPI application (`backend/app/main.py`). This is the primary cause of the error.
2.  **Incorrect Frontend Data Handling:** The API returns image lists within a `root` object (`{"root": [...]}`). The `PhotoGrid` component directly uses `response.data` instead of `response.data.root`, causing the `images.map` function to fail.
3.  **On-Disk Path vs. URL Path:** The backend needs to correctly map an image's database record (which contains a relative file path) to a full, accessible path on the server's file system to serve the file.

## 4. Step-by-Step Implementation Plan

### Phase 1: Backend Testing & Bug Reproduction

The first step is to create a backend integration test that proves the bug exists. This test will simulate the entire workflow from uploading a zip file to fetching the image list.

**Strategy:**

1.  **Create a Test Archive:** Prepare a simple `test_images.zip` file containing a few small JPEG images. This will be used as the test artifact.
2.  **Write an Integration Test (`backend/tests/test_api_e2e.py`):**
    *   The test will use the `TestClient` from FastAPI.
    *   **Step 1: Upload.** It will `POST` the `test_images.zip` to the `/v1/datasets/` endpoint.
    *   **Step 2: Mock & Run Worker.** Since the test environment can't easily run a full Celery worker, we will directly invoke the `process_dataset_upload` task function from `backend/app/worker.py` with the arguments passed from the upload endpoint. This tests the worker's logic without the complexity of a message queue.
    *   **Step 3: Poll for Completion.** The test will need to get the `dataset_id` created by the worker.
    *   **Step 4: Fetch Image List.** It will then make a `GET` request to `/v1/datasets/{dataset_id}/images/`.
    *   **Assertion:** The test will assert that the response is successful (200 OK) and that the returned JSON contains a list of image metadata corresponding to the files in the zip archive. This part of the test should pass.

### Phase 2: Backend Fix

With the bug confirmed, we will implement the missing endpoint.

**Strategy:**

1.  **Create New Endpoint in `main.py`:**
    *   Add a new endpoint: `GET /v1/images/{image_id}/file`.
    *   This endpoint will take an `image_id` (UUID) as a path parameter.
    *   It will query the `Image` table in the database to find the corresponding record.
    *   If the image is not found, it will return a 404 error.
    *   It will construct the full, absolute path to the image file on the server's file system. The base path is `/data/datasets/{dataset_id}/` and the relative path is stored in the `image.path` field.
    *   It will use FastAPI's `FileResponse` to efficiently stream the image file back to the client.

2.  **Update Backend Test:**
    *   Add a new step to the integration test created in Phase 1.
    *   After successfully fetching the image list, the test will loop through the returned image metadata.
    *   For each image, it will make a `GET` request to the new `/v1/images/{image_id}/file` endpoint.
    *   **Assertion:** The test will assert that the response is successful (200 OK) and that the `content-type` header is correct (e.g., `image/jpeg`).
    *   This test will now pass, confirming the backend fix.

### Phase 3: Frontend Testing & Fix

Now we shift focus to the frontend to ensure it correctly consumes the new backend functionality.

**Strategy:**

1.  **Write a Frontend Test:**
    *   Create a test for the `PhotoGrid.jsx` component.
    *   Use a mocking library (like `msw` or `jest.mock`) to mock `axios.get`.
    *   The first mock will intercept calls to `/api/v1/datasets/.../images/` and return a sample payload, correctly nested: `{ "root": [{ "id": "...", "path": "image1.jpg" }] }`.
    *   The test will assert that the component renders an `<img>` tag.
    *   It will also assert that the `src` attribute of the `<img>` tag is correctly constructed to point to `/api/v1/images/.../file`.

2.  **Fix `PhotoGrid.jsx`:**
    *   Modify the `fetchImages` function to correctly access the image list from the response: `setImages(response.data.root)`.
    *   Update the `img` tag's `src` attribute to point to the new, correct endpoint: `src={'/api/v1/images/${image.id}/file'}`.

3.  **Verify Frontend Test:** The test written in the previous step should now pass.

## 5. Acceptance Criteria

The task will be considered complete when all of the following criteria are met:

1.  The new backend integration test (`test_api_e2e.py`) passes, successfully uploading an archive and then fetching both the image list and the binary data for each image via the new API endpoint.
2.  The new frontend test for `PhotoGrid.jsx` passes, verifying that it correctly parses the API response and renders `<img>` tags with the correct `src` URLs.
3.  **Manual Verification:**
    *   A user can upload a `.zip` file containing images through the UI.
    *   After the processing task completes, selecting that dataset in the UI displays a grid of images.
    *   The browser's developer tools show successful (200 OK) `GET` requests for each image file.
    *   There are no errors in the browser console or in the backend/worker logs related to fetching images.