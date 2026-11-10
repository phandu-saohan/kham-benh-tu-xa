import uuid

class MockHISAdapter:
    name = "mock"

    def __init__(self):
        self._seed_patients = []

    def find_patient(self, national_id: str = "", phone: str = "", full_name: str = ""):
        clean_id = (national_id or "").strip()
        clean_phone = (phone or "").strip()
        clean_name = (full_name or "").strip().lower()

        for p in self._seed_patients:
            if clean_id and p.get("national_id") == clean_id:
                return p
            if clean_phone and p.get("phone") == clean_phone:
                return p
            if clean_name and clean_name == p.get("full_name", "").lower():
                return p
        return None

    def register_patient(self, payload: dict) -> str:
        national_id = payload.get("national_id") or ""
        suffix = national_id[-6:] if len(national_id) >= 6 else uuid.uuid4().hex[:6].upper()
        pid = f"HIS-CC-{suffix}"
        record = {
            "pid": pid,
            "full_name": payload.get("full_name", ""),
            "gender": payload.get("gender", "Nam"),
            "dob": payload.get("dob", ""),
            "phone": payload.get("phone", ""),
            "national_id": national_id,
            "bhyt_no": payload.get("bhyt_no", ""),
            "address": payload.get("address", ""),
            "blood_type": payload.get("blood_type", ""),
            "allergies": [{"substance": payload.get("allergies", "Không ghi nhận"), "severity": "none"}] if payload.get("allergies") else [],
            "conditions": []
        }
        self._seed_patients.append(record)
        return pid

    def get_patient_summary(self, external_patient_id: str):
        found = next((p for p in self._seed_patients if p["pid"] == external_patient_id), None)
        if found:
            return {
                "source": "his",
                "external_patient_id": external_patient_id,
                "conditions": found.get("conditions", []),
                "allergies": found.get("allergies", []),
                "encounters": [],
                "patient": found
            }
        return {
            "source": "his",
            "external_patient_id": external_patient_id,
            "conditions": [],
            "allergies": [],
            "encounters": []
        }
