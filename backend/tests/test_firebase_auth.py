import pytest
from datetime import datetime, timezone, timedelta
from jose import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.models import User

client = TestClient(app)

def test_get_firebase_config():
    res = client.get("/api/v1/auth/firebase-config")
    assert res.status_code == 200
    data = res.json()
    assert "apiKey" in data
    assert "projectId" in data
    assert "authDomain" in data
    assert "enabled" in data
    assert isinstance(data["enabled"], bool)

def test_firebase_verify_token_existing_user(clean_database):
    # Existing demo patient phone is 0912345678 (+84912345678)
    now = datetime.now(timezone.utc)
    claims = {
        "sub": "firebase-uid-existing-12345",
        "phone_number": "+84912345678",
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "iat": int(now.timestamp()),
        "aud": "mock-project",
        "iss": "https://securetoken.google.com/mock-project"
    }
    mock_token = jwt.encode(claims, "secret", algorithm="HS256")

    res = client.post("/api/v1/auth/firebase/verify-token", json={
        "id_token": mock_token
    })

    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["phone_number"] == "0912345678"
    assert data["user"]["role"] == "patient"
    assert data["user"]["full_name"] == "Demo Patient"

def test_firebase_verify_token_new_user(clean_database):
    # Brand new patient phone
    new_phone = "+84988776655"
    now = datetime.now(timezone.utc)
    claims = {
        "sub": "firebase-uid-new-99999",
        "phone_number": new_phone,
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "iat": int(now.timestamp()),
        "aud": "mock-project",
        "iss": "https://securetoken.google.com/mock-project"
    }
    mock_token = jwt.encode(claims, "secret", algorithm="HS256")

    res = client.post("/api/v1/auth/firebase/verify-token", json={
        "id_token": mock_token,
        "full_name": "Phan Hoàng Phúc"
    })

    assert res.status_code == 200
    data = res.json()
    assert data["user"]["phone_number"] == "0988776655"
    assert data["user"]["full_name"] == "Phan Hoàng Phúc"
    assert data["user"]["role"] == "patient"

    # User must be saved in database
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone_number == "0988776655").first()
        assert user is not None
        assert user.full_name == "Phan Hoàng Phúc"
    finally:
        db.close()
