# ==============================================================================
# DOCKERFILE - TELEMEDICINE & HIS/EMR FULL-STACK PRODUCTION RUNTIME (DOKPLOY)
# ==============================================================================

# Stage 1: Build Frontend React SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python 3.11 Production Server (FastAPI + SPA Static Delivery)
FROM python:3.11-slim AS runner
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=3001 \
    APP_ENV=production \
    DATABASE_URL=sqlite:////app/data/telemedicine.db \
    SEED_DEMO=true \
    CORS_ORIGINS="*"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Backend Dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy Backend Source Code
COPY backend/ ./backend/

# Copy Compiled Frontend Assets from Builder Stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/backend/frontend/dist

# Persistent data directory for SQLite fallback
RUN mkdir -p /app/data /app/backend/data

WORKDIR /app/backend

EXPOSE 3001

CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-3001}"]
