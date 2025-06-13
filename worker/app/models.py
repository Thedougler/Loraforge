from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, UUID
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func
import os
import uuid

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

    def __repr__(self):
        return f"<Image(id={self.id}, filename='{self.filename}', dataset_id={self.dataset_id})>"

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