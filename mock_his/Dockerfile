FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Dữ liệu sqlite ghi ra mounted volume
ENV HIS_DB_PATH=/data/his.db
VOLUME ["/data"]

EXPOSE 8100
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
