# PRISM backend — FastAPI + Tesseract OCR
FROM python:3.11-slim

# Tesseract for scanned-PDF / image OCR
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Model weights: mount the repo-root model/ folder to /model at runtime
# (docker-compose does this). ML mode activates only if weights are present.
ENV ML_MODEL_DIR=/model \
    DB_URL=sqlite+aiosqlite:////data/prism.db \
    PRISM_REPORT_DIR=/data/reports

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
