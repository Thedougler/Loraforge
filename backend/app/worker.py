from celery import Celery
import os
import uuid
import zipfile
from PIL import Image as PILImage # Use an alias to avoid conflict with Image model
import magic # for file type detection
from pathlib import Path
from sqlalchemy.orm import Session
from app.models import SessionLocal, Dataset, Image, BackgroundTask, TaskStatus

celery_app = Celery(
    "loraforge_worker",
    include=["app.worker"]
)

celery_app.conf.update(
    broker_url=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
    result_backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)


import logging

# Configure logging for Celery tasks
logging.basicConfig(level=logging.INFO)
task_logger = logging.getLogger(__name__)

if __name__ == "__main__":
    celery_app.start()

@celery_app.task(name='worker.app.worker.process_dataset_upload')
def process_dataset_upload(task_id: str, temp_file_path: str, original_filename: str, dataset_name: str, db: Session = None):
    task_logger.info(f"Starting 'process_dataset_upload' for task_id: {task_id}, file: {temp_file_path}")

    # If a session is not provided (e.g., when called by Celery), create one
    if db is None:
        db = SessionLocal()
    
    task = db.query(BackgroundTask).filter(BackgroundTask.id == uuid.UUID(task_id)).first()
    if not task:
        task_logger.error(f"Background task with ID {task_id} not found.")
        return {"status": "failed", "message": f"Task ID {task_id} not found."}

    try:
        task.status = TaskStatus.RUNNING.value
        task.progress = 5
        task.result = "Starting dataset processing..."
        db.add(task)
        db.commit()
        db.refresh(task)

        if not os.path.exists(temp_file_path):
            task_logger.error(f"File not found for processing: {temp_file_path}")
            task.status = TaskStatus.FAILURE.value
            task.result = f"File not found: {temp_file_path}"
            db.add(task)
            db.commit()
            return {"status": "failed", "message": f"File not found: {temp_file_path}"}

        dataset_id = uuid.uuid4() # Generate a new UUID for the dataset
        dataset_base_dir = os.path.join("/data/datasets", str(dataset_id))
        # Extract directly into the dataset's root directory, not a nested 'originals'
        target_unpack_dir = dataset_base_dir

        task_logger.info(f"Creating directory for dataset {dataset_id} at {target_unpack_dir}")
        os.makedirs(target_unpack_dir, exist_ok=True)
        task_logger.info("Directory created successfully.")

        task.progress = 10
        task.result = "Unpacking archive..."
        db.add(task)
        db.commit()
        db.refresh(task)

        file_extension = os.path.splitext(temp_file_path)[1].lower()
        unpacked = False

        if file_extension == '.zip':
            task_logger.info(f"Unpacking ZIP archive: {temp_file_path} to {target_unpack_dir}")
            with zipfile.ZipFile(temp_file_path, 'r') as zip_ref:
                zip_ref.extractall(target_unpack_dir)
            task_logger.info(f"Successfully unpacked ZIP archive to {target_unpack_dir}")
            unpacked = True
        elif file_extension == '.rar':
            task_logger.warning(
                f"RAR archive detected: {temp_file_path}. Unpacking RAR files requires the 'rarfile' library "
                "and the 'unrar' system utility, which are not currently implemented. "
                "Skipping unpacking for this file."
            )
            task.status = TaskStatus.FAILURE.value
            task.result = "RAR unpacking not supported without external libraries."
            db.add(task)
            db.commit()
            return {"status": "failed", "message": "RAR unpacking not supported without external libraries."}
        else:
            task_logger.error(f"Unsupported file type: {file_extension} for file: {temp_file_path}")
            task.status = TaskStatus.FAILURE.value
            task.result = f"Unsupported file type: {file_extension}"
            db.add(task)
            db.commit()
            return {"status": "failed", "message": f"Unsupported file type: {file_extension}"}

        if unpacked:
            task.progress = 40
            task.result = "Creating dataset record..."
            db.add(task)
            db.commit()
            db.refresh(task)
            
            # Create a new dataset record in the database
            new_dataset = Dataset(id=dataset_id, name=dataset_name, source_path=temp_file_path)
            db.add(new_dataset)
            db.commit()
            db.refresh(new_dataset)
            task_logger.info(f"Created dataset record for ID: {new_dataset.id}, Name: {new_dataset.name}")

            task.progress = 50
            task.result = "Processing images..."
            db.add(task)
            db.commit()
            db.refresh(task)

            # Iterate through unpacked image files and create records
            # Define allowed MIME types and extensions
            allowed_mime_types = [
                'image/',    # Matches any image MIME type (e.g., image/jpeg, image/png)
                'video/',    # Matches any video MIME type (e.g., video/mp4, video/webm)
                'text/plain' # Matches plain text files
            ]
            allowed_extensions = (
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', # Image extensions
                '.mp4', '.avi', '.mov', '.mkv', '.webm', # Video extensions
                '.txt' # Text extensions
            )
            processed_file_count = 0
            for root, _, files in os.walk(target_unpack_dir):
                for f in files:
                    full_path = os.path.join(root, f)
                    relative_path = os.path.relpath(full_path, target_unpack_dir) # path relative to dataset root folder

                    # Check if it's an allowed file based on MIME type or extension
                    mime_type = None
                    try:
                        mime_type = magic.from_file(full_path, mime=True)
                    except Exception as e:
                        task_logger.warning(f"Could not detect MIME type for {full_path}: {e}")
                    
                    is_allowed_mime = any(mime_type and mime_type.startswith(t) for t in allowed_mime_types)
                    is_allowed_extension = f.lower().endswith(allowed_extensions)

                    if is_allowed_mime or is_allowed_extension:
                        width, height = None, None
                        # Try to get dimensions only for images
                        if mime_type and mime_type.startswith('image/'):
                            try:
                                with PILImage.open(full_path) as img:
                                    width, height = img.size
                                # task_logger.info(f"Extracted dimensions for {f}: {width}x{height}")
                            except Exception as e:
                                task_logger.warning(f"Could not extract dimensions for {f} using Pillow: {e}")
                            
                        # Create a new record for the file
                        new_file_record = Image( # Rename Image model to Asset or similar in future
                            dataset_id=dataset_id,
                            filename=f,
                            path=os.path.basename(full_path),  # Store only the filename
                            width=width,
                            height=height,
                            mime_type=mime_type # Store the detected MIME type
                        )
                        db.add(new_file_record)
                        db.commit() # Commit each file record
                        processed_file_count += 1
                        # task_logger.info(f"Created file record for file: {f} (Path: {relative_path}, MIME: {mime_type})")
                    else:
                        task_logger.info(f"Skipping unsupported file: {f} (MIME: {mime_type})")
            
            task.progress = 90
            task.result = f"Processed {processed_file_count} files. Cleaning up..."
            db.add(task)
            db.commit()
            db.refresh(task)

            task_logger.info(f"Removing temporary uploaded file: {temp_file_path}")
            try:
                os.remove(temp_file_path)
                task_logger.info(f"Removed temporary file: {temp_file_path}")
            except OSError as e:
                task_logger.error(f"Error removing temporary file {temp_file_path}: {e}")
                task.status = TaskStatus.FAILURE.value
                task.result = f"Cleanup failed: {e}"
                db.add(task)
                db.commit()
                return {"status": "completed_with_cleanup_error", "dataset_id": str(dataset_id), "original_file": temp_file_path, "error": str(e)}

        task.status = TaskStatus.SUCCESS.value
        task.progress = 100
        task.result = f"Dataset '{dataset_name}' with ID {dataset_id} processed successfully."
        db.add(task)
        db.commit()
        db.refresh(task)

        task_logger.info(f"Finished 'process_dataset_upload' for dataset ID: {dataset_id}")
        return {"status": "success", "dataset_id": str(dataset_id), "original_file": temp_file_path, "unpacked_to": target_unpack_dir}
    except Exception as e:
        db.rollback() # Rollback changes if any error occurs
        task_logger.error(f"An unexpected error occurred during dataset processing for {temp_file_path}: {e}", exc_info=True)
        task.status = TaskStatus.FAILURE.value
        task.result = f"An unexpected error occurred: {e}"
        db.add(task)
        db.commit()
        return {"status": "failed", "message": f"An unexpected error occurred: {e}"}

@celery_app.task
def add(x, y):
    return x + y