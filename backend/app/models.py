from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, UUID, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Mapped
from sqlalchemy.sql import func
from datetime import datetime
import os
import uuid
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, RootModel

# Database connection string from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@db:5432/loraforge_db")

# Create a declarative base for our models
Base = declarative_base()

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    source_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("Image", back_populates="dataset")

    def __repr__(self):
        return f"<Dataset(id={self.id}, name='{self.name}')>"

class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False)
    filename = Column(String, nullable=False)
    path = Column(String, nullable=False) # Relative path within the dataset's originals folder
    width = Column(Integer)
    height = Column(Integer)
    mime_type = Column(String, nullable=True)

    dataset = relationship("Dataset", back_populates="images")

    def __repr__(self):
        return f"<Image(id={self.id}, filename='{self.filename}', dataset_id={self.dataset_id})>"

class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"

class BackgroundTask(Base):
    __tablename__ = "background_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_name = Column(String, nullable=False)
    status = Column(String, default=TaskStatus.PENDING.value, nullable=False) # PENDING, RUNNING, SUCCESS, FAILURE
    progress = Column(Integer, default=0, nullable=False)  # 0-100
    result = Column(Text, nullable=True) # Storing JSON string or other relevant text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<BackgroundTask(id={self.id}, name='{self.task_name}', status='{self.status}', progress={self.progress})>"

# Pydantic models for API requests and responses
class DatasetInput(BaseModel):
    name: str

class DatasetResponse(BaseModel):
    id: uuid.UUID
    name: str

    class Config:
        from_attributes = True

class DatasetsResponse(RootModel):
    root: List[DatasetResponse]

class ImageResponse(BaseModel):
    id: uuid.UUID
    dataset_id: uuid.UUID
    filename: str
    path: str
    width: Optional[int] = None
    height: Optional[int] = None
    mime_type: Optional[str] = None # Add MIME type to Pydantic model

    class Config:
        from_attributes = True

class ImagesResponse(RootModel):
    root: List[ImageResponse]

class BackgroundTaskResponse(BaseModel):
    id: uuid.UUID
    task_name: str
    status: TaskStatus
    progress: int
    result: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BackgroundTaskCreate(BaseModel):
    task_name: str
    status: Optional[TaskStatus] = TaskStatus.PENDING
    progress: Optional[int] = 0
    result: Optional[str] = None


# Create the engine, sessionmaker, and Base metadata
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to create tables (for initial setup or testing)
def create_db_tables():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Creating database tables...")
    create_db_tables()
    print("Tables created successfully (if they didn't exist).")