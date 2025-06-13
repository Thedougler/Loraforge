from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Request
from typing import Optional, List
import shutil
import uuid
import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.models import (
    Base, # Import Base for metadata
    engine, # Import engine for create_all
    get_db,
    Dataset,
    Image,
    DatasetResponse,
    DatasetsResponse,
    ImagesResponse,
    BackgroundTask,
    BackgroundTaskCreate,
    BackgroundTaskResponse,
    TaskStatus
)

from celery import Celery

celery_app = Celery('backend', broker='redis://redis:6379/0')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_db_and_tables():
    logger.info("Creating database tables...")
    Base.metadata.create_all(engine)
    logger.info("Database tables created.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Creating tables..")
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

UPLOAD_DIR = "/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
async def read_root():
    return {"message": "Welcome to LoRAForge Backend API!"}

@app.get("/health")
async def health_check():
    return {"status": "OK"}

@app.post("/v1/datasets/", response_model=BackgroundTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_dataset(
    request: Request,
    db: Session = Depends(get_db)
):
    form = await request.form()
    name = form.get("name")
    file = form.get("file")
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file found in the upload request.")

    # Save the uploaded file to a temporary directory
    original_filename = file.filename
    file_extension = os.path.splitext(original_filename)[1]
    unique_temp_filename = f"{uuid.uuid4()}{file_extension}"
    temp_file_path = os.path.join(UPLOAD_DIR, unique_temp_filename)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Uploaded archive saved to {temp_file_path}")

        # Create a new background task record
        # Use Dataset's ID as the task_id for simplicity and traceability
        task_id = uuid.uuid4()
        now = datetime.utcnow()
        db_task = BackgroundTask(
            id=task_id,
            task_name="process_dataset_upload",
            status=TaskStatus.PENDING.value,
            progress=0,
            result=f"Processing dataset upload for '{name}' (filename: {original_filename}, temp_path: {temp_file_path})",
            created_at=now,
            updated_at=now
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)

        logger.info(f"Background task created: {db_task.id} for dataset '{name}'")

        # Enqueue the Celery task
        # Pass the unique temp file path, original filename, and dataset name
        task = celery_app.send_task(
            "worker.app.worker.process_dataset_upload",
            args=[str(task_id), temp_file_path, original_filename, name]
        )
        logger.info(f"Celery task enqueued with ID: {task.id}")
        
        # Return the task information
        return db_task
    except Exception as e:
        logger.error(f"Error uploading dataset: {e}")
        # Clean up the temporary file if something went wrong
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Could not upload dataset: {e}")
    finally:
        await file.close()

@app.get("/v1/datasets/", response_model=DatasetsResponse)
async def get_all_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).all()
    return DatasetsResponse(root=datasets)

@app.get("/v1/tasks/{task_id}/status", response_model=BackgroundTaskResponse)
async def get_task_status(task_id: uuid.UUID, db: Session = Depends(get_db)):
    task = db.query(BackgroundTask).filter(BackgroundTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.get("/v1/datasets/{dataset_id}/images/", response_model=ImagesResponse)
async def get_images_for_dataset(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    images = db.query(Image).filter(Image.dataset_id == dataset_id).all()
    return ImagesResponse(root=images)

from fastapi.responses import FileResponse # Added import here

@app.get("/v1/images/{image_id}/file")
async def get_image_file(image_id: uuid.UUID, db: Session = Depends(get_db)):
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Construct the full path to the image file
    # This assumes /data/datasets/ contains dataset_id directories, and image.path is relative to that.
    # From ARCHITECTURE.md: /data/datasets/{dataset_id}/
    # From app/worker.py: target_unpack_dir = /data/datasets/{dataset_id}
    # And image.path is relative to target_unpack_dir
    dataset_path = os.path.join("/data/datasets", str(image.dataset_id))
    image_full_path = os.path.join(dataset_path, image.path)

    if not os.path.exists(image_full_path):
        logger.error(f"Image file not found on disk: {image_full_path}")
        raise HTTPException(status_code=404, detail="Image file not found on server")

    # FastAPI's FileResponse automatically handles streaming and sets Content-Type
    return FileResponse(image_full_path, media_type=image.mime_type)