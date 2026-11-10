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
    SECRET_KEY=careconnect-telemedicine-prod-secret-93993-c4f8817a5be66a0129bcdd9745e1f98b \
    PHI_ENCRYPTION_KEY=careconnect-phi-key-c4f8817a5be66a0129bcdd9745e1f98bc195e347ad1efd88002df35154ee8780 \
    DATABASE_URL=postgresql+psycopg://postgres:tobklteb61gqvbz0adpsyurqmkun1tir@72.61.123.73:5432/telemedicine \
    SUPABASE_URL=https://supabase-supabase-7c4fe6-72-61-123-73.sslip.io \
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjIxMDY3MTU4MjksImlhdCI6MTc5MTM1NTgyOSwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.V3vdSFKXr9uLlYG0QLUYnjtug8AKKoLt6NL_vZCPRxk \
    SUPABASE_BUCKET=telemedicine-records \
    ALLOW_SEED_DEMO=false \
    SEED_DEMO=false \
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
