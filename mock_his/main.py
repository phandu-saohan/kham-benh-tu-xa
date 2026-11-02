"""
Mock HIS Server — server HIS/EMR giả để test tích hợp telemedicine.
- REST domain API: tra cứu bệnh nhân, tạo lần khám, đẩy hồ sơ/đơn thuốc.
- HL7 FHIR R4: accept Bundle (Patient/Encounter/Condition/MedicationRequest), GET theo tài nguyên.
- Event log: xem telemedicine đã đẩy gì qua /admin/events.
- Auth: header X-API-Key (dùng chung HIS_API_KEY phía telemedicine).

CHÚ Ý: chỉ dùng dữ liệu TỔNG HỢP, không đụng dữ liệu bệnh án thật.
"""
import json
import os
import uuid
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from store import HisStore

API_KEY = os.environ.get("HIS_API_KEY", "his-dev-key-change-me")
FHIR_ROUTE = "/fhir"

app = FastAPI(
    title="Mock HIS Server",
    version="1.0.0",
    description="HIS/EMR tổng hợp (synthetic) chỉ để test tích hợp — KHÔNG dùng dữ liệu thật.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # mock server nội bộ, không production
    allow_methods=["*"],
    allow_headers=["*"],
)

store = HisStore()


def require_api_key(x_api_key: str = Header(default="")):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid X-API-Key")


# ---------------------------------------------------------------------------
# Middleware: ghi event log mọi request ghi dữ liệu
# ---------------------------------------------------------------------------
@app.middleware("http")
async def event_log(request: Request, call_next):
    response = await call_next(request)
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.url.path not in ("/health",):
        summary = ""
        if response.status_code < 400:
            summary = f"accepted via {request.url.path}"
        store.log_event(request.method, request.url.path, response.status_code, summary)
    return response


# ---------------------------------------------------------------------------
# Common models
# ---------------------------------------------------------------------------
class PatientIn(BaseModel):
    pid: str = ""  # để trống sẽ tự sinh PID
    full_name: str = Field(min_length=1)
    gender: str | None = None
    dob: str | None = None
    phone: str | None = None
    national_id: str | None = None
    bhyt_no: str | None = None
    address: str | None = None


class EncounterIn(BaseModel):
    patient_id: str = Field(min_length=1, description="PID bên HIS")
    doctor_id: str | None = None
    department_id: str | None = None
    started_at: str | None = None
    status: str = "in-progress"
    reason: str | None = None


class DocumentIn(BaseModel):
    doc_type: str = "clinical-record"
    title: str = ""
    content_base64: str = ""


class PrescriptionIn(BaseModel):
    patient_id: str = Field(min_length=1)
    encounter_id: str | None = None
    national_rx_code: str | None = None
    instruction_text: str = ""
    items: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Health & admin
# ---------------------------------------------------------------------------
@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "mock-his", "version": "1.0.0",
            "note": "Synthetic data only. Not a real hospital system."}


@app.get("/admin/stats", tags=["admin"], dependencies=[Depends(require_api_key)])
def stats():
    return store.stats()


@app.get("/admin/events", tags=["admin"], dependencies=[Depends(require_api_key)])
def recent_events(limit: int = 50):
    return store.recent_events(limit)


# ---------------------------------------------------------------------------
# HIS domain REST
# ---------------------------------------------------------------------------
@app.get("/api/departments", tags=["his"], dependencies=[Depends(require_api_key)])
def departments():
    return store.list_departments()


@app.get("/api/doctors", tags=["his"], dependencies=[Depends(require_api_key)])
def doctors(department_id: str = ""):
    return store.list_doctors(department_id)


@app.get("/api/patients", tags=["his"], dependencies=[Depends(require_api_key)])
def find_patients(search: str = "", limit: int = 20):
    return store.find_patients(search, limit)


@app.get("/api/patients/{pid}", tags=["his"], dependencies=[Depends(require_api_key)])
def patient_summary(pid: str):
    patient = store.get_patient(pid)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {pid} not found")
    return {
        "source": "mock-his",
        "patient": patient,
        "warning": "Synthetic data only. Not connected to a real hospital HIS.",
    }


@app.post("/api/patients", tags=["his"], status_code=201, dependencies=[Depends(require_api_key)])
def register_patient(data: PatientIn):
    pid = store.upsert_patient(data.model_dump())
    return {"pid": pid, "mapped": True}


@app.post("/api/encounters", tags=["his"], status_code=201, dependencies=[Depends(require_api_key)])
def create_encounter(data: EncounterIn):
    patient = store.get_patient(data.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Unknown patient {data.patient_id}")
    return store.create_encounter(data.model_dump())


@app.post("/api/encounters/{encounter_id}/documents", tags=["his"], status_code=201,
          dependencies=[Depends(require_api_key)])
def upload_document(encounter_id: str, data: DocumentIn):
    if not store.encounter_exists(encounter_id):
        raise HTTPException(status_code=404, detail=f"Unknown encounter {encounter_id}")
    result = store.create_document(encounter_id, data.model_dump())
    return {"encounter_id": encounter_id, **result}


@app.post("/api/prescriptions", tags=["his"], status_code=201, dependencies=[Depends(require_api_key)])
def push_prescription(data: PrescriptionIn):
    if not store.get_patient(data.patient_id):
        raise HTTPException(status_code=404, detail=f"Unknown patient {data.patient_id}")
    payload = data.model_dump()
    payload["items_json"] = json.dumps(payload.pop("items", []), ensure_ascii=False)
    return store.create_prescription(payload)


# ---------------------------------------------------------------------------
# HL7 FHIR R4 — tối thiểu đủ test Bundle builder phía telemedicine
# ---------------------------------------------------------------------------
@app.get(f"{FHIR_ROUTE}/metadata", tags=["fhir"])
def metadata():
    return {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "fhirVersion": "4.0.1",
        "format": ["application/fhir+json"],
        "rest": [{"mode": "server",
                  "resource": [{"type": t} for t in ("Patient", "Encounter", "Condition", "MedicationRequest")]}],
    }


@app.get(f"{FHIR_ROUTE}/Patient", tags=["fhir"], dependencies=[Depends(require_api_key)])
def fhir_patients(identifier: str = "", name: str = "", phone: str = ""):
    search = identifier or name or phone
    patients = store.find_patients(search, limit=25)
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(patients),
        "entry": [{"resource": {"resourceType": "Patient", "id": p["pid"],
                                "identifier": [{"value": p["pid"]}],
                                "name": [{"text": p["full_name"]}],
                                "telecom": [{"system": "phone", "value": p["phone"]}]}}
                  for p in patients],
    }


@app.get(f"{FHIR_ROUTE}/Patient/{{pid}}", tags=["fhir"], dependencies=[Depends(require_api_key)])
def fhir_patient(pid: str):
    patient = store.get_patient(pid)
    if not patient:
        return {"resourceType": "OperationOutcome",
                "issue": [{"severity": "error", "code": "not-found", "diagnostics": f"Patient {pid} not found"}]}
    return {"resourceType": "Patient", "id": pid,
            "identifier": [{"system": "urn:oid:mock-his", "value": pid}],
            "name": [{"text": patient["full_name"]}],
            "gender": patient["gender"], "birthDate": patient["dob"]}


def _bundle_to_resource_map(bundle: dict) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {}
    for entry in bundle.get("entry", []):
        res = entry.get("resource") or entry
        rt = res.get("resourceType")
        if rt:
            groups.setdefault(rt, []).append(res)
    return groups


@app.post(f"{FHIR_ROUTE}", tags=["fhir"], dependencies=[Depends(require_api_key)])
def fhir_bundle(bundle: dict):
    if bundle.get("resourceType") != "Bundle":
        return {"resourceType": "OperationOutcome",
                "issue": [{"severity": "error", "code": "invalid", "diagnostics": "Expected a Bundle"}]}

    groups = _bundle_to_resource_map(bundle)
    accepted: list[dict] = []
    patient_pids: list[str] = []

    # Patient trước, sau đó Encounter/Condition/MedicationRequest
    for res in groups.get("Patient", []):
        pid = (res.get("identifier") or [{}])[0].get("value") or res.get("id") or ""
        name = (res.get("name") or [{}])[0].get("text") or ""
        telecom = (res.get("telecom") or [{}])[0].get("value")
        pid = store.upsert_patient({"pid": pid, "full_name": name, "phone": telecom})
        patient_pids.append(pid)
        accepted.append({"resourceType": "Patient", "id": pid})

    encounter_ids: list[str] = []
    for res in groups.get("Encounter", []):
        subject_ref = ((res.get("subject") or {}).get("reference") or "")
        pid = subject_ref.split("/")[-1]
        enc = store.create_encounter({
            "patient_id": pid,
            "started_at": (res.get("period") or {}).get("start"),
            "status": res.get("status", "in-progress"),
            "reason": (res.get("reasonCode") or [{}])[0].get("text", "") if res.get("reasonCode") else "",
        })
        encounter_ids.append(enc["encounter_id"])
        accepted.append({"resourceType": "Encounter", "id": enc["encounter_id"]})

    conditions: list[dict] = []
    for res in groups.get("Condition", []):
        conditions.append(res)
    for res in groups.get("MedicationRequest", []):
        accepted.append({"resourceType": "MedicationRequest",
                         "diagnostics": "Ghi nhận MedicationRequest (mock lưu gần nghĩa nhất)"})

    if groups.get("Condition") and patient_pids:
        con = groups["Condition"][0]
        coding = ((con.get("code") or {}).get("coding") or [{}])[0]
        store.upsert_conditions_note(patient_pids[0], coding.get("code"), coding.get("display"))
        accepted.append({"resourceType": "Condition"})

    if not accepted:
        return {"resourceType": "OperationOutcome",
                "issue": [{"severity": "warning", "code": "not-supported",
                           "diagnostics": "Không có resource nào được Mock HIS xử lý"}]}

    return {
        "resourceType": "Bundle",
        "type": "transaction-response",
        "entry": [{"resource": {"resourceType": "OperationOutcome",
                                "issue": [{"severity": "information", "code": "created",
                                           "diagnostics": f"Stored synthetic {a['resourceType']} {a.get('id', '')}"}]}}
                  for a in accepted],
    }


@app.get(f"{FHIR_ROUTE}/Encounter", tags=["fhir"], dependencies=[Depends(require_api_key)])
def fhir_encounters(patient: str = ""):
    patient_info = store.get_patient(patient) if patient else None
    encs = patient_info["encounters"] if patient_info else []
    return {"resourceType": "Bundle", "type": "searchset", "total": len(encs),
            "entry": [{"resource": {"resourceType": "Encounter", "id": e["id"], "status": e["status"]}}
                      for e in encs]}
