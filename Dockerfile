FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY backend_fastapi/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code into container
COPY backend_fastapi /app

# Expose the port that the FastAPI app will listen on
EXPOSE 8000

# Command to run the application using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
