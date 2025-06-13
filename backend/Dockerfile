# Use an Ubuntu CUDA 12.2 development image as the base
FROM python:3.10-slim-bullseye

# Set environment variables for Python
ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND noninteractive

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libmagic-dev \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create a working directory inside the container
WORKDIR /app
ENV PYTHONPATH=/app

# Copy backend requirements and install them
# We'll create a requirements.txt with FastAPI and uvicorn
COPY backend/requirements.txt .
# Copy example data
COPY example_data /app/example_data
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
# Assuming the FastAPI application code will be in this directory
COPY backend/ /app

# Expose the port FastAPI will run on
EXPOSE 8000

# Command to run the FastAPI application with Uvicorn
# Assuming your main FastAPI application instance is named 'main:app' in 'app/backend/main.py'
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]