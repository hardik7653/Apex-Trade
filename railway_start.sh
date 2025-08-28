#!/bin/bash

# Install backend dependencies
pip install -r backend_fastapi/requirements.txt

# Navigate to backend directory
cd backend_fastapi

# Run the FastAPI app with Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
