from celery import Celery
import os
from main import app as fastapi_app  # Assuming your FastAPI app instance is named 'app' in main.py

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


if __name__ == "__main__":
    celery_app.start()