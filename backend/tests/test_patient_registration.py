import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_check_patient_his_existing():
    payload = {
        "full_name": "Nguyễn Thị Bích Hòa",
        "phone_number": "0900000001",
        "identity_card": "080180012345"
    }
    res = client.post("/api/v1/auth/check-patient-his", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["exists_in_his"] is True
    assert data["external_patient_id"] == "HIS-2024-0001"
    assert data["already_registered_in_app"] is False
    assert data["bhyt_no"] == "GD4812345678001"
    assert "Tìm thấy hồ sơ bệnh án" in data["message"]

def test_check_patient_his_new():
    payload = {
        "full_name": "Trần Thảo Ly",
        "phone_number": "0988001122",
        "identity_card": "079300998877"
    }
    res = client.post("/api/v1/auth/check-patient-his", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["exists_in_his"] is False
    assert data["external_patient_id"] is None
    assert "Chưa có hồ sơ" in data["message"]

def test_register_patient_account_existing_his():
    payload = {
        "full_name": "Nguyễn Thị Bích Hòa",
        "phone_number": "0900000001",
        "identity_card": "080180012345",
        "password": "Password123!"
    }
    res = client.post("/api/v1/auth/patient-register", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["external_patient_id"] == "HIS-2024-0001"
    assert data["his_action"] == "linked_existing"
    assert data["user"]["role"] == "patient"
    assert data["user"]["phone_number"] == "0900000001"

def test_register_patient_account_new_his():
    payload = {
        "full_name": "Phan Hoàng Phúc",
        "phone_number": "0933445566",
        "identity_card": "079201992211",
        "password": "Password123!",
        "address": "78 Bạch Đằng, Bình Thạnh",
        "bhyt_code": "GD4799988877766"
    }
    res = client.post("/api/v1/auth/patient-register", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["his_action"] == "created_new_his"
    assert "HIS-" in data["external_patient_id"]
    assert data["user"]["full_name"] == "Phan Hoàng Phúc"

def test_register_duplicate_fails():
    payload = {
        "full_name": "Phan Hoàng Phúc",
        "phone_number": "0933445566",
        "identity_card": "079201992299",
        "password": "Password123!"
    }
    res1 = client.post("/api/v1/auth/patient-register", json=payload)
    assert res1.status_code == 200

    # Thử đăng ký lần 2 với cùng số điện thoại
    res2 = client.post("/api/v1/auth/patient-register", json=payload)
    assert res2.status_code == 400
    assert "Số điện thoại này đã được đăng ký" in res2.json()["detail"]
