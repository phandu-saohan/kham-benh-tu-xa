"""
Supabase Cloud Storage Integration Module
Manages uploads and public/authenticated asset URLs for medical records,
consultation attachments, prescriptions, and patient files.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from app.config import settings

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://supabase-supabase-7c4fe6-72-61-123-73.sslip.io").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjIxMDY3MTU4MjksImlhdCI6MTc5MTM1NTgyOSwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.V3vdSFKXr9uLlYG0QLUYnjtug8AKKoLt6NL_vZCPRxk"
)
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "telemedicine-records")

def get_supabase_public_url(bucket: str, file_path: str) -> str:
    """Return the direct public URL for a file stored in a public Supabase bucket."""
    clean_path = file_path.lstrip("/")
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{clean_path}"

def upload_file_to_supabase(
    file_bytes: bytes,
    destination_path: str,
    bucket: str = SUPABASE_STORAGE_BUCKET,
    content_type: str = "application/octet-stream",
    upsert: bool = True
) -> str | None:
    """
    Upload a binary file directly to Supabase Storage API using the service role key.
    Returns the public URL on success, or None on error.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase credentials not configured, skipping Supabase upload.")
        return None

    clean_dest = destination_path.lstrip("/")
    endpoint = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{clean_dest}"

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true" if upsert else "false"
    }

    try:
        req = urllib.request.Request(endpoint, data=file_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status in (200, 201):
                public_url = get_supabase_public_url(bucket, clean_dest)
                logger.info(f"Uploaded file to Supabase Storage: {public_url}")
                return public_url
            else:
                logger.warning(f"Supabase upload returned HTTP status {resp.status}")
                return None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"Supabase upload HTTPError {e.code}: {error_body}")
        return None
    except Exception as e:
        logger.error(f"Supabase upload error: {str(e)}")
        return None

def check_supabase_health() -> dict:
    """Verify connectivity to Supabase Storage service."""
    try:
        url = f"{SUPABASE_URL}/storage/v1/bucket"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
        }
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            bucket_names = [b.get("name") for b in data] if isinstance(data, list) else []
            return {
                "status": "connected",
                "url": SUPABASE_URL,
                "buckets": bucket_names,
                "primary_bucket": SUPABASE_STORAGE_BUCKET
            }
    except Exception as e:
        return {
            "status": "disconnected",
            "url": SUPABASE_URL,
            "error": str(e)
        }
