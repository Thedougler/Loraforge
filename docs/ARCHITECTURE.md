# LoRA-Forge Architecture
## 1. Architectural Overview
LoRA-Forge is designed as a high-performance, containerized web application. The architecture separates concerns into five primary services, orchestrated by Docker Compose, to ensure a responsive user experience and scalable backend processing.
 * Frontend: A modern, single-page application (SPA) that runs in the user's browser.
 * Backend: A stateless API server that handles business logic and orchestrates all backend operations.
 * Database (PostgreSQL): A persistent relational database for storing all structured metadata.
 * Task Queue & Cache (Redis): An in-memory data store serving as the message broker for background jobs and as a high-speed cache.
 * Worker: An asynchronous task processor that executes long-running jobs independently of the API.
## 2. Core Principles
 * Stateless Backend: The Python/FastAPI backend does not store any session state between requests. This allows for easier scaling and robustness. State is managed by the frontend and persisted in the database or Redis.
 * Asynchronous by Default: Any operation that could take more than a few seconds (file I/O, model inference, image processing) is offloaded to the background worker via Redis. The API's role is to accept the job and respond immediately.
 * Cache-First Strategy: For frequently accessed or computationally expensive data (like dataset statistics), the backend will attempt to retrieve it from the Redis cache before querying the main PostgreSQL database.
 * Separation of Data and Metadata: Physical image/video files are stored on the file system. The database stores structured metadata about those files, while Redis holds temporary state and cached data.
## 3. System Components Diagram
This diagram illustrates the flow of information between the components, highlighting the central role of Redis.
```mermaid
graph TD
    %% User's Machine Subgraph
    subgraph User's Machine
        Browser[🌐 Browser <br> Frontend SPA (React.js + Vite)]
    end

    %% Server / Docker Environment Subgraph
    subgraph Server / Docker Environment
        API[▶️ Backend API Server <br> Python (FastAPI + Uvicorn)]
        Worker[👷‍♂️ Background Worker <br> Celery (GPU-enabled)]
        DB[🐘 Database <br> PostgreSQL (SQLAlchemy ORM)]
        MessageBrokerCache[⚡ Message Broker & Cache <br> Redis]
        FileSystem[🗃️ Persistent File System <br> /data Volume]
    end

    %% Interactions
    Browser -- HTTPS API Calls --> API
    API -- Reads/Writes Metadata --> DB
    API -- Enqueues Jobs --> MessageBrokerCache
    MessageBrokerCache -- Dequeues Jobs --> Worker
    Worker -- Reads/Writes Files --> FileSystem
    Worker -- Updates Metadata --> DB
    API -- Reads/Writes Cache --> MessageBrokerCache
    Worker -- Accesses GPU for tasks --> Worker
    API -- Serves File URLs --> Browser

    %% Flow of data/control
    API -.->|Validated Input| DB
    Worker -.->|Processing Results| DB
    MessageBrokerCache -.->|Cached Data| API
    MessageBrokerCache -.->|Task Payloads| Worker
```
## 4. Component Breakdown
### 4.1. Frontend (React.js / Vite)
*   **Framework & Toolchain:** A [React.js](https://react.dev/) single-page application (SPA) built using the [Vite](https://vitejs.dev/) development toolchain.
*   **User Interface & State Management:** The UI is constructed with [MUI (Material-UI)](https://mui.com/material-ui/react-components/) components. Global application state is managed using [Redux Toolkit](https://redux-toolkit.js.org/).
*   **API Interaction:** Communicates with the backend API server by making HTTP requests to a `/api` endpoint. During development, the Vite development server proxies these requests to `http://backend:8000`.
*   **Deployment:** Defined by a `Dockerfile` that uses a multi-stage build process. It creates an optimized static build of the React application and serves it via an [Nginx](https://www.nginx.com/) web server in the final stage.
*   **Key Responsibilities:**
    *   Rendering the interactive user interface, including photo grids, upload forms, and various data visualizations.
    *   Initiating API calls to the Backend API for data retrieval and task submission.
    *   Displaying real-time progress for background tasks, potentially through polling status endpoints or WebSockets.
    *   Managing client-side application state and user interactions.
    *   Handling features like data upload (e.g., using `react-dropzone` for file management).

### 4.2. Backend API Server (Python / FastAPI)
*   **Framework & Runtime:** A Python application built with the [FastAPI](https://fastapi.tiangolo.com/) framework, running with [Uvicorn](https://www.uvicorn.org/)'s ASGI server.
*   **Architecture:** Follows a stateless RESTful API design.
*   **Key Dependencies:** `fastapi`, `uvicorn`, `sqlalchemy` (for ORM), `psycopg2-binary` (PostgreSQL adapter), `redis` (for cache/Celery integration), `pillow` (for image processing utilities).
*   **Key Responsibilities:**
    *   Exposing a comprehensive RESTful API for all Loraforge services.
    *   Validating incoming user requests and data payloads.
    *   Interacting with the [PostgreSQL](https://www.postgresql.org/) database via SQLAlchemy for persistent data storage (e.g., managing datasets, images, metadata).
    *   Delegating long-running, computationally intensive tasks to the Background Worker by pushing job messages onto the [Redis](https://redis.io/) message broker.
    *   Implementing caching strategies using Redis to reduce database load for frequently accessed data.
    *   Providing API endpoints for actions such as file uploads (`POST /datasets/upload`), image retrieval (`GET /datasets/{id}/images`), batch processing (`POST /images/batch-process`), and task status checks (`GET /tasks/{task_id}/status`).

### 4.3. Message Broker & Cache (Redis)
*   **Type:** An in-memory data store.
*   **Purpose:** Serves a dual role as both the high-speed central hub for asynchronous communication and a volatile caching layer.
*   **Key Responsibilities:**
    *   **As a Message Broker for Celery:** Manages a queue (or multiple queues) of jobs dispatched by the Backend API and consumed by the Background Worker. This decouples the API from the worker, allowing the API to remain responsive while heavy tasks are processed asynchronously.
    *   **As a Caching Layer:** Stores frequently accessed or computationally expensive data results with a configurable Time-To-Live (TTL). This significantly reduces latency and load on the PostgreSQL database by serving cached data directly to the Backend API.

### 4.4. Background Worker (Celery)
*   **Framework & Environment:** A [Celery](https://docs.celeryq.dev/en/stable/) worker process specifically designed for executing background tasks.
*   **Resource Utilization:** Configured to run in a separate Docker container built on an `nvidia/cuda` base image, indicating its capability and intention to leverage GPU resources for specific tasks (e.g., image processing, model inference).
*   **Key Dependencies:** `celery`, `redis` (for connectivity to the message broker), `sqlalchemy` (for database interaction).
*   **Key Responsibilities:**
    *   **Job Consumption:** Continuously monitors the Redis task queue for new job messages dispatched by the Backend API.
    *   **Heavy Lifting & Computation:** Executes all CPU/GPU intensive and long-running operations, such as:
        *   Image format conversion.
        *   Video keyframe extraction and deduplication.
        *   Group and character splitting.
        *   Image analysis and metadata extraction.
        *   Automated image filtering and cleaning.
        *   Intelligent dataset composition and balancing.
        *   Conditional image upscaling.
        *   LLM-based image captioning.
    *   **Database Updates:** Persists the results of its work, such as generated captions, updated image metadata, and task status, back into the PostgreSQL database.

### 4.5. Database (PostgreSQL)
*   **Type:** A robust, open-source relational database management system.
*   **ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) is used as the Object Relational Mapper (ORM) for Python applications, providing a convenient way to interact with the database using Python objects.
*   **Purpose:** Serves as the single source of truth for all persistent, structured metadata related to datasets, images, tasks, and user configurations.
*   **Key Responsibilities:**
    *   Storing metadata for datasets (e.g., `id`, `name`, `source_path`, `created_at`).
    *   Maintaining core image information (e.g., `id`, `dataset_id`, `filename`, `path`, `width`, `height`).
    *   Storing flexible image analysis results (e.g., `image_id`, `metadata_key`, `metadata_value`).
    *   Archiving generated captions (e.g., `image_id`, `caption_text`, `model_used`).
    *   Tracking the lifecycle and status of background tasks (`id`, `status`, `progress`, `result`).
## 5. Data Flow Example: Batch Captioning
 * User Action: User selects 100 images in the frontend and clicks "Batch Caption".
 * Frontend: Sends a POST request to /images/batch-process with a payload containing the operation type and image IDs.
 * Backend API:
   * Receives and validates the request.
   * Creates a new record in the background_tasks table in PostgreSQL.
   * Pushes a job message onto the 'tasks' list in Redis. The message contains the task type and image IDs.
   * Immediately returns a 202 Accepted response to the Frontend with the unique task_id.
 * Frontend: Receives the task_id and begins polling the GET /tasks/{task_id}/status endpoint to show progress.
 * Worker:
   * Is constantly monitoring the 'tasks' list in Redis. It pulls the new captioning job from the queue.
   * Updates the task status to RUNNING in the PostgreSQL database.
   * For each image, it performs the captioning and saves the result to the captions table in PostgreSQL.
   * After completing all images, it updates the task's final status to COMPLETED.
 * Frontend: The next poll to the status endpoint returns COMPLETED, and the UI updates to show the task is done, refreshing the view to display the new captions.
## 6. On-Disk File System Layout
All media and temporary files are stored in a Docker volume mounted at /data to ensure data persistence across container restarts.
``` plaintext
/data/
├── datasets/
│   ├── {dataset_id_1}/
│   │   ├── originals/
│   │   │   ├── image01.jpg
│   │   ├── processed/
│   │   │   └── image01_face_0.png
│   │   └── exports/
│   │       └── training_data_v1.zip
│   └── {dataset_id_2}/
└── uploads/
    └── temp_archive.zip
```
