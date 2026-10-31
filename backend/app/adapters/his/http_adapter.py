"""
Adapter kết nối Mock HIS Server (hoặc bất kỳ HIS nào có REST contract tương tự).
Chủ động timeout, không retry storm, không log nội dung nhạy cảm.
"""
import logging

import httpx

logger = logging.getLogger("his.http")


class HttpHISAdapter:
    """Gọi Mock HIS Server qua HTTP. Contract: mock_his/main.py."""

    name = "http_his"

    def __init__(self, base_url: str, api_key: str, timeout_seconds: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout_seconds

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.base_url,
            headers={"X-API-Key": self.api_key, "Content-Type": "application/json"},
            timeout=self.timeout,
        )

    # --- tương thích interface MockHISAdapter -------------------------------
    def get_patient_summary(self, external_patient_id: str):
        try:
            with self._client() as client:
                resp = client.get(f"/api/patients/{external_patient_id}")
            if resp.status_code == 404:
                return {"source": "his", "external_patient_id": external_patient_id,
                        "found": False, "warning": "Không tìm thấy PID trong HIS"}
            resp.raise_for_status()
            data = resp.json()
            return {"source": "his", "found": True, **data}
        except httpx.HTTPError as exc:
            logger.warning("HIS patient lookup failed: %s", exc)
            return {"source": "his", "external_patient_id": external_patient_id,
                    "found": False, "error": "his_unreachable"}

    def create_encounter_draft(self, payload: dict):
        """Đăng ký lần khám vào HIS. payload: {patient_id, doctor_id, department_id, started_at, reason}."""
        body = {
            "patient_id": payload.get("external_patient_id") or payload.get("patient_id"),
            "doctor_id": payload.get("his_doctor_id"),
            "department_id": payload.get("his_department_id"),
            "started_at": payload.get("starts_at"),
            "reason": payload.get("reason"),
        }
        if not body["patient_id"]:
            return {"source": "his", "status": "rejected", "reason": "missing patient_id"}
        try:
            with self._client() as client:
                resp = client.post("/api/encounters", json=body)
                resp.raise_for_status()
            return {"source": "his", "status": "created", **resp.json()}
        except httpx.HTTPError as exc:
            logger.warning("HIS encounter push failed: %s", exc)
            return {"source": "his", "status": "failed", "error": "his_unreachable"}

    # --- mở rộng: FHIR bundle ------------------------------------------------
    def push_fhir_bundle(self, bundle: dict):
        try:
            with self._client() as client:
                resp = client.post("/fhir", json=bundle)
                resp.raise_for_status()
            return {"source": "his", "status": "accepted", **resp.json()}
        except httpx.HTTPError as exc:
            logger.warning("HIS FHIR push failed: %s", exc)
            return {"source": "his", "status": "failed", "error": "his_unreachable"}

    def push_prescription(self, payload: dict):
        try:
            with self._client() as client:
                resp = client.post("/api/prescriptions", json=payload)
                resp.raise_for_status()
            return {"source": "his", "status": "accepted", **resp.json()}
        except httpx.HTTPError as exc:
            logger.warning("HIS prescription push failed: %s", exc)
            return {"source": "his", "status": "failed", "error": "his_unreachable"}

    def find_patient(self, national_id: str = "", phone: str = "", full_name: str = ""):
        search_query = national_id or phone or full_name
        if not search_query:
            return None
        try:
            with self._client() as client:
                resp = client.get("/api/patients", params={"search": search_query})
            if resp.status_code == 200:
                results = resp.json()
                if results and isinstance(results, list):
                    for r in results:
                        if national_id and r.get("national_id") == national_id:
                            return r
                        if phone and r.get("phone") == phone:
                            return r
                    return results[0]
            return None
        except Exception as exc:
            logger.warning("HIS patient lookup failed: %s", exc)
            return None

    def register_patient(self, payload: dict):
        body = {
            "full_name": payload.get("full_name"),
            "gender": payload.get("gender"),
            "dob": payload.get("dob"),
            "phone": payload.get("phone"),
            "national_id": payload.get("national_id"),
            "bhyt_no": payload.get("bhyt_no", ""),
            "address": payload.get("address", "")
        }
        try:
            with self._client() as client:
                resp = client.post("/api/patients", json=body)
                if resp.status_code in (200, 201):
                    return resp.json().get("pid")
            return None
        except Exception as exc:
            logger.warning("HIS patient registration failed: %s", exc)
            return None

    def health(self) -> bool:
        try:
            with self._client() as client:
                resp = client.get("/health")
            return resp.status_code == 200
        except httpx.HTTPError:
            return False
