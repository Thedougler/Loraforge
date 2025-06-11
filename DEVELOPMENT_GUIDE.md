# LoRAForge Development Guide
## 1. Introduction
Welcome, developer! This guide provides all the necessary steps to set up the LoRAForge development environment, run the application, and contribute code. Following these instructions carefully is essential for maintaining code quality and a consistent workflow.
The entire development environment is containerized using Docker. You will not need to install Python, Node.js, or PostgreSQL directly on your host machine.
## 2. Prerequisites
Before you begin, ensure you have the following software installed and running on your local machine:
 * Git: For version control.
 * Docker: For running the containerized services.
 * Docker Compose: For orchestrating the multi-container application (usually included with Docker Desktop).
## 3. First-Time Setup
These steps will get a running instance of the application on your local machine.
 * Clone the Repository:
   Open your terminal and clone the project from GitHub.
   git clone https://github.com/Thedougler/Loraforge.git

 * Navigate to the Project Directory:
   cd Loraforge

 * Build and Start the Services:
   Use Docker Compose to build the images for the frontend, backend, and worker, and start all services in detached mode (-d).
   docker compose up --build -d

   * --build: This flag forces Docker to build the images from the Dockerfiles the first time you run it.
   * -d: This flag runs the containers in the background.
The initial build may take several minutes as Docker downloads base images and installs dependencies.
## 4. Running the Application
 * Access the Frontend: The web UI is available at http://localhost:8000.
 * Access the Backend API Docs: The FastAPI auto-generated documentation is available at http://localhost:8080/docs.
Viewing Logs
To view the real-time logs for all running services:
docker compose logs -f

To view the logs for a specific service (e.g., the backend):
docker compose logs -f backend

### Stopping the Application
To stop all running services:
docker compose down

## 5. Development Workflow
All code changes must be made on a dedicated feature branch.
 * Ensure main is Up-to-Date:
   Before starting new work, pull the latest changes from the main branch.
   git checkout main
git pull origin main

 * Create a New Branch:
   Create a new branch for your task. The branch name must be based on the GitHub Issue you are working on, prefixed with feature/ or fix/.
   For example for working on issue #123
git checkout -b feature/issue-123

 * Make Your Code Changes:
   Modify the code in the /frontend or /backend directories as required by the issue's technical plan.
## 6. Code Quality and Testing
Before committing your changes, you must run the following commands to ensure your code is clean, formatted correctly, and passes all tests.
Linting and Formatting
These commands run the formatters and linters inside the respective Docker containers.
 * Format Backend Code (Black & isort):
   docker-compose exec backend black .
docker compose exec backend isort .

 * Lint Backend Code (Flake8):
   docker compose exec backend flake8 .

 * Format & Lint Frontend Code (Prettier & ESLint):
   docker compose exec frontend npm run lint -- --fix

## Running Tests
This command runs the automated test suite for the backend.
 * Run Backend Tests (Pytest):
   docker compose exec backend pytest -v

All tests must pass before you can submit your changes.
## 7. Submitting Changes
 * Stage and Commit Your Changes:
   Add your modified files and commit them using the Conventional Commits format. This format is mandatory.
   git add .
git commit -m "feat: add user registration endpoint" -m "Implements the API endpoint for creating a new user as per issue #123. Includes Pydantic models and database logic."

   * Types: feat (new feature), fix (bug fix), docs (documentation), style, refactor, test, chore.
 * Push Your Branch to GitHub:
   git push origin feature/issue-123

 * Open a Pull Request:
   * Go to the GitHub repository in your browser.
   * A prompt will appear to create a Pull Request from your new branch. Click it.
   * Fill out the PR template, linking it to the issue it resolves (e.g., "Closes #123").
   * Submit the Pull Request for review.
