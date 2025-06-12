from fastapi import FastAPI, UploadFile, File, HTTPException
from typing import Optional
import shutil
import uuid
import os
import logging

from .celery import celery_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

UPLOAD_DIR = "/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
async def read_root():
    return {"message": "Welcome to LoRAForge Backend API!"}

@app.get("/health")
async def health_check():
    return {"status": "OK"}

@app.post("/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file found in the upload request.")

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved to {file_path}")

        # Enqueue the Celery task
        task = celery_app.send_task("process_dataset_upload", args=[file_path])
        return {"status": "success", "message": "File uploaded and processing initiated.", "task_id": task.id}
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Could not upload file: {e}")
    finally:
        await file.close()