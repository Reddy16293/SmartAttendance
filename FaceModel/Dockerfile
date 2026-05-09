FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    INSIGHTFACE_MODEL_NAME=buffalo_l \
    INSIGHTFACE_ALLOWED_MODULES=detection,recognition \
    INSIGHTFACE_DET_SIZE=320,320

# Build and runtime dependencies for OpenCV + InsightFace on Debian slim
# build-essential required for insightface to compile Cython extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy only dependency manifest first for better layer caching
COPY requirement.txt ./requirement.txt

# CPU-only build: strip GPU runtime (saves ~200MB), keep only CPU packages
RUN grep -v '^onnxruntime-gpu\s*$' requirement.txt > requirements.cpu.txt && \
    pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.cpu.txt

# Download buffalo_l during build so the first request does not spend time pulling the archive.
RUN python -c "import insightface; app = insightface.app.FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'], allowed_modules=['detection', 'recognition']); app.prepare(ctx_id=-1, det_size=(320, 320)); print('✅ buffalo_l model cached')"

# Copy application code
COPY . .

EXPOSE 8002

# Health check - simple HTTP check without external dependency
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/', timeout=5).close()" || exit 1

# Use environment variable PORT if provided, default to 8002
# Model downloads on first request (lazy loading) to reduce container memory footprint
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8002}"]
