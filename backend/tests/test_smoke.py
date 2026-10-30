import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_telemedicine.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("SEED_DEMO", "false")

from fastapi.testclient import TestClient
from app.main import app, seed_demo
from app.db import Base, engine, SessionLocal
from app.security import hash_password
from app.models import User

def setup_module():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if not db.query(User).filter_by(email="patient@example.test").first():
        db.add_all([
            User(email="patient@example.test", full_name="Demo Patient", role="patient", password_hash=hash_password("ChangeMe123!"), external_patient_id="DEMO-P001"),
            User(email="doctor@example.test", full_name="Demo Doctor", role="doctor", password_hash=hash_password("ChangeMe123!")),
            User(email="admin@example.test", full_name="Demo Admin", role="admin", password_hash=hash_password("ChangeMe123!"))
        ])
        db.commit()
    db.close()

def get_token(client, email="patient@example.test"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "ChangeMe123!"})
    assert r.status_code == 200
    return r.json()["access_token"]

def test_health():
    with TestClient(app) as c:
        assert c.get("/health").status_code == 200

def test_login_and_me():
    with TestClient(app) as c:
        token = get_token(c)
        r = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["role"] == "patient"

def test_patient_can_list_doctors():
    with TestClient(app) as c:
        token = get_token(c)
        r = c.get("/api/v1/doctors", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert any(d["full_name"] == "Demo Doctor" for d in r.json())

def test_patient_his_adapter_is_mock():
    with TestClient(app) as c:
        token = get_token(c)
        r = c.get("/api/v1/patients/me/his-summary", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["source"] == "mock"
