from celery import Celery
import os
import uuid
import zipfile
from PIL import Image as PILImage # Use an alias to avoid conflict with Image model
import magic # for file type detection
from pathlib import Path
from sqlalchemy.orm import Session
from .models import SessionLocal, Dataset, Image

from .main import app as fastapi_app

celery_app = Celery(
    "loraforge_worker",
    include=["main"]  # Include the main module where tasks might be defined
)

celery_app.conf.update(
    broker_url=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
    result_backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)

# Optional: Configure Celery to use the FastAPI app context if needed
# For example, if your tasks need access to FastAPI's dependencies or database sessions
# with FastAPI context:
# @celery_app.task
# def my_task_with_fastapi_context():
#     with fastapi_app.app_context(): # This is pseudocode as FastAPI doesn't have app_context like Flask
#         # Your task logic using FastAPI components
#         pass


import logging

# Configure logging for Celery tasks
logging.basicConfig(level=logging.INFO)
task_logger = logging.getLogger(__name__)

if __name__ == "__main__":
    celery_app.start()

@celery_app.task(name="process_dataset_upload")
def process_dataset_upload(file_path: str, original_filename: str = None):
    task_logger.info(f"Starting 'process_dataset_upload' for file: {file_path}")

    db: Session = SessionLocal() # Get database session
    try:
        if not os.path.exists(file_path):
            task_logger.error(f"File not found for processing: {file_path}")
            return {"status": "failed", "message": f"File not found: {file_path}"}

        dataset_id = uuid.uuid4()
        dataset_base_dir = os.path.join("/data/datasets", str(dataset_id))
        target_unpack_dir = os.path.join(dataset_base_dir, "originals")

        task_logger.info(f"Creating directory for dataset {dataset_id} at {target_unpack_dir}")
        os.makedirs(target_unpack_dir, exist_ok=True)
        task_logger.info("Directory created successfully.")

        file_extension = os.path.splitext(file_path)[1].lower()
        unpacked = False

        if file_extension == '.zip':
            task_logger.info(f"Unpacking ZIP archive: {file_path} to {target_unpack_dir}")
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(target_unpack_dir)
            task_logger.info(f"Successfully unpacked ZIP archive to {target_unpack_dir}")
            unpacked = True
        elif file_extension == '.rar':
            task_logger.warning(
                f"RAR archive detected: {file_path}. Unpacking RAR files requires the 'rarfile' library "
                "and the 'unrar' system utility, which are not currently implemented. "
                "Skipping unpacking for this file."
            )
            return {"status": "failed", "message": "RAR unpacking not supported without external libraries."}
        else:
            task_logger.error(f"Unsupported file type: {file_extension} for file: {file_path}")
            return {"status": "failed", "message": f"Unsupported file type: {file_extension}"}

        if unpacked:
            # Create a new dataset record in the database
            dataset_name = original_filename if original_filename else os.path.basename(file_path)
            new_dataset = Dataset(id=dataset_id, name=dataset_name, source_path=file_path)
            db.add(new_dataset)
            db.commit()
            db.refresh(new_dataset)
            task_logger.info(f"Created dataset record for ID: {new_dataset.id}, Name: {new_dataset.name}")

            # Iterate through unpacked image files and create records
            image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp') # Add more if needed
            for root, _, files in os.walk(target_unpack_dir):
                for f in files:
                    full_path = os.path.join(root, f)
                    relative_path = os.path.relpath(full_path, target_unpack_dir) # path relative to originals folder

                    # Check if it's an image based on MIME type or extension
                    mime_type = None
                    try:
                        mime_type = magic.from_file(full_path, mime=True)
                    except Exception as e:
                        task_logger.warning(f"Could not detect MIME type for {full_path}: {e}")
                    
                    if mime_type and mime_type.startswith('image/') or f.lower().endswith(image_extensions):
                        width, height = None, None
                        try:
                            with PILImage.open(full_path) as img:
                                width, height = img.size
                            task_logger.info(f"Extracted dimensions for {f}: {width}x{height}")
                        except Exception as e:
                            task_logger.warning(f"Could not extract dimensions for {f} using Pillow: {e}")
                            
                        new_image = Image(
                            dataset_id=dataset_id,
                            filename=f,
                            path=relative_path,
                            width=width,
                            height=height
                        )
                        db.add(new_image)
                        task_logger.info(f"Created image record for file: {f} (Path: {relative_path})")
                    else:
                        task_logger.info(f"Skipping non-image file: {f} (MIME: {mime_type})")
            db.commit() # Commit all image records in one go

            task_logger.info(f"Removing temporary uploaded file: {file_path}")
            try:
                os.remove(file_path)
                task_logger.info(f"Removed temporary file: {file_path}")
            except OSError as e:
                task_logger.error(f"Error removing temporary file {file_path}: {e}")
                return {"status": "completed_with_cleanup_error", "dataset_id": str(dataset_id), "original_file": file_path, "error": str(e)}

        task_logger.info(f"Finished 'process_dataset_upload' for dataset ID: {dataset_id}")
        return {"status": "success", "dataset_id": str(dataset_id), "original_file": file_path, "unpacked_to": target_unpack_dir}
    except Exception as e:
        db.rollback() # Rollback changes if any error occurs
        task_logger.error(f"An unexpected error occurred during dataset processing for {file_path}: {e}", exc_info=True)
        return {"status": "failed", "message": f"An unexpected error occurred: {e}"}
    finally:
        db.close() # Always close the session