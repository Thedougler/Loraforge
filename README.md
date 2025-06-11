# LoRA-Forge
A self-hosted, mobile-friendly manager for creating optimized character LoRA training datasets.
Project Vision
The process of creating high-quality datasets for LoRA training is often a tedious, manual, and disorganized task. AI artists and developers spend countless hours sorting, cropping, filtering, and captioning thousands of files instead of focusing on creative work.
LoRA-Forge aims to solve this problem by providing an intelligent, automated, and self-hosted platform to transform a chaotic collection of media into a perfectly optimized and balanced dataset. It is designed to be the central workbench for any artist using OneTrainer or Kohya_ss, streamlining the entire data preparation pipeline from raw files to a final, train-ready archive. Our goal is to make dataset creation fast, repeatable, and accessible to everyone.
Key Features
The core of LoRA-Forge is a set of powerful batch operations accessible from a modern, responsive web UI.
 * 📦 Effortless Ingestion: Upload an archive (.zip, .rar) and have it automatically unpacked into a new, editable dataset.
 * 🖼️ Batch Formatting: Convert entire datasets to a specific file format (e.g., JPG, PNG, WEBP) with one click.
 * 🎬 Video Processing: Automatically extract keyframes from videos, intelligently remove near-duplicate frames, and discard the original video files.
 * 👥 Group Splitting: Detect images with multiple people and automatically create cropped versions for each individual.
 * ✂️ Character Splitting: For every person detected, generate additional cropped images of their head + hair and upper body to strengthen concept learning.
 * 🧠 Image Analysis: Batch process images to extract and save valuable metadata to the database, including dimensions, content type (face, upper body, full body), NSFW status, facial expressions, and poses.
 * 🗑️ Automated Filtering: Clean your dataset by automatically removing very low-resolution images and images containing multiple faces.
 * ⚖️ Dataset Composer: Intelligently select the best combination of images from your collection to meet your target composition and size goals, creating a perfectly balanced dataset.
 * ⬆️ Smart Upscaling: Automatically upscale images as needed to meet dataset resolution requirements, only processing what is necessary.
 * ✍️ Batch Captioning: Use a remote LLM to automatically generate high-quality captions for your final dataset in either SDXL or FLUX prompt styles.
 * 📚 Pack & Ship: Generate a final, downloadable .zip archive containing your balanced dataset and all corresponding .txt caption files, ready for training.
Tech Stack
This project is built with a modern, containerized architecture for simple deployment and robust performance.
 * Deployment: 🐳 Docker / Docker Compose
 * Backend: 🐍 Python with FastAPI for a high-performance API.
 * Frontend: ✨ React with Vite for a fast, responsive, and modern user interface.
 * Database: 🐘 PostgreSQL for storing all image metadata and dataset information.
 * Libraries: Key Python libraries for image processing will include Pillow, OpenCV, and scikit-image.
Development Philosophy
To ensure clarity, consistency, and effective collaboration (especially with AI assistants), this project adheres to a strict development philosophy. All contributions must follow these principles.
 * Granularity & Single Responsibility: Every pull request must address one single, specific GitHub Issue. Work should be broken down into the smallest logical and verifiable steps.
 * Explicitness Over Ambiguity: All work must be guided by a detailed Technical Plan and Acceptance Criteria outlined in the corresponding issue. No new features or changes should be implemented that are not explicitly requested in the issue.
 * Test-Driven Development (TDD): Where applicable, new features must be accompanied by tests that verify the Acceptance Criteria. A failing test should be written first, followed by the implementation code to make it pass.
 * Adherence to Standards: All code must be formatted and linted according to the project's standards (black for Python, prettier for the frontend) before being committed. Commit messages should follow the Conventional Commits specification.
Getting Started
 * Clone the repository:
   git clone https://github.com/your-username/lora-forge.git
cd lora-forge

 * Launch with Docker Compose:
   docker-compose up -d

 * Access the WebUI:
   Open your browser and navigate to http://localhost:8000.
Project Roadmap
The following features represent the planned functionality for a complete version of LoRA-Forge.
 * [ ] Core: Dataset creation from archives.
 * [ ] Core: Infinite scroll, lazy-loading photo grid viewer.
 * [ ] Core: Dynamic dataset statistics view.
 * [ ] Batch Operations: Image format conversion.
 * [ ] Batch Operations: Video keyframe extraction & deduplication.
 * [ ] Batch Operations: Group photo splitting.
 * [ ] Batch Operations: Character component splitting.
 * [ ] Batch Operations: Image metadata analysis.
 * [ ] Batch Operations: Automated filtering and cleaning.
 * [ ] Batch Operations: Intelligent dataset composition/balancing.
 * [ ] Batch Operations: Conditional image upscaling.
 * [ ] Batch Operations: LLM-based image captioning.
 * [ ] Core: Pack final dataset to a zip archive.
Contributing
Contributions are welcome! Please review the Development Philosophy and pick an open issue to work on.
License
This project is licensed under the MIT License. See the LICENSE file for details.
