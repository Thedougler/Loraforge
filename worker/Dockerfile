# Use an Ubuntu CUDA 12.2 development image as the base
FROM nvidia/cuda:12.2.0-devel-ubuntu22.04

# Set environment variables for Python
ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND noninteractive

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3.10 \
        python3-pip \
        build-essential \
        libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a working directory inside the container
WORKDIR /app
ENV PYTHONPATH=/app

# Copy ai-worker requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the ai-worker source code
COPY . .

# Expose the port Celery will run on (optional, but good practice if it has a flower instance or other exposed ports)
# EXPOSE 8000 # No need to expose port for worker usually

# Command to run the Celery worker