"""
Smoke test cho Mock HIS Server — chạy:
    cd mock_his && python -m pytest tests_smoke.py -q
Dùng HIS_DB_PATH trỏ tới file tạm để không đụng his.db dev.
"""
import os
import tempfile

os.environ.setdefault("HIS_DB_PATH", os.path.join(tempfile.mkdtemp(), "his_test.db"))

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

KEY_OK = {"X-API-Key": os.environ.get("HIS_API_KEY", "his-dev-key-change-me")}

client = TestClient(app)


def test_health_public():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["service"] == "mock-his"


def test_auth_required():
    assert client.get("/api/patients").status_code == 401
    assert client.get("/api/patients", headers=KEY_OK).status_code == 200


def test_seed_patients_searchable():
    resp = client.get("/api/patients", params={"search": "HIS-2024-0001"}, headers=KEY_OK)
    assert resp.status_code == 200
    patients = resp.json()
    assert patients and patients[0]["pid"] == "HIS-2024-0001"


def test_patient_summary_not_found():
    assert client.get("/api/patients/HIS-9999-9999", headers=KEY_OK).status_code == 404


def test_register_and_summary_new_patient():
    resp = client.post("/api/patients", headers=KEY_OK, json={
        "full_name": "TEST PATIENT", "phone": "0999999999",
    })
    assert resp.status_code == 201
    pid = resp.json()["pid"]
    summary = client.get(f"/api/patients/{pid}", headers=KEY_OK).json()
    assert summary["patient"]["full_name"] == "TEST PATIENT"


def test_encounter_and_document_flow():
    patients = client.get("/api/patients", params={"search": "HIS-2024-0002"}, headers=KEY_OK).json()
    pid = patients[0]["pid"]
    enc = client.post("/api/encounters", headers=KEY_OK, json={
        "patient_id": pid, "reason": "Test telehealth", "started_at": "2026-10-31T09:00:00",
    })
    assert enc.status_code == 201
    encounter_id = enc.json()["encounter_id"]

    doc = client.post(f"/api/encounters/{encounter_id}/documents", headers=KEY_OK, json={
        "doc_type": "clinical-record", "title": "Hồ sơ test",
    })
    assert doc.status_code == 201
    assert doc.json()["document_id"].startswith("DOC-")

    # encounter lạ phải 404
    assert client.post("/api/encounters/UNKNOWN/documents", headers=KEY_OK,
                       json={"doc_type": "x"}).status_code == 404


def test_fhir_bundle_accepted():
    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
            {"resource": {"resourceType": "Patient", "id": "pat-1",
                          "identifier": [{"value": "HIS-2024-0001"}],
                          "name": [{"text": "Nguyễn Thị Bích Hòa"}]}},
            {"resource": {"resourceType": "Encounter", "status": "finished",
                          "subject": {"reference": "Patient/HIS-2024-0001"},
                          "period": {"start": "2026-10-31T09:00:00Z"}}},
            {"resource": {"resourceType": "Condition",
                          "subject": {"reference": "Patient/HIS-2024-0001"},
                          "code": {"coding": [{"system": "http://hl7.org/fhir/sid/icd-10",
                                               "code": "I10", "display": "Hypertension"}]}}},
        ],
    }
    resp = client.post("/fhir", headers=KEY_OK, json=bundle)
    assert resp.status_code == 200
    body = resp.json()
    assert body["resourceType"] == "Bundle"
    assert len(body["entry"]) >= 3

    fhir_patient = client.get("/fhir/Patient/HIS-2024-0001", headers=KEY_OK).json()
    assert fhir_patient["resourceType"] == "Patient"


def test_fhir_invalid_payload():
    resp = client.post("/fhir", headers=KEY_OK, json={"resourceType": "Patient", "id": "x"})
    body = resp.json()
    assert body["resourceType"] == "OperationOutcome"
    assert body["issue"][0]["severity"] == "error"


def test_events_recorded():
    events = client.get("/admin/events", headers=KEY_OK).json()
    assert isinstance(events, list)
    assert any(e["method"] == "POST" for e in events)
