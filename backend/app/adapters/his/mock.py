import uuid

class MockHISAdapter:
    name = "mock"

    def __init__(self):
        self._seed_patients = [
            {
                "pid": "HIS-2024-0001",
                "full_name": "Nguyễn Thị Bích Hòa",
                "gender": "Nữ",
                "dob": "1980-04-12",
                "phone": "0900000001",
                "national_id": "080180012345",
                "bhyt_no": "GD4812345678001",
                "address": "12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
                "blood_type": "A+",
                "allergies": [{"substance": "Penicillin", "severity": "moderate"}],
                "conditions": [{"code": "I10", "display": "Tăng huyết áp vô căn (lành tính)", "note": "Theo dõi định kỳ"}]
            },
            {
                "pid": "HIS-2024-0002",
                "full_name": "Trần Văn Đạt",
                "gender": "Nam",
                "dob": "1992-09-25",
                "phone": "0900000002",
                "national_id": "079192023456",
                "bhyt_no": "GD4797931899999",
                "address": "45 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh",
                "blood_type": "O+",
                "allergies": [],
                "conditions": []
            },
            {
                "pid": "HIS-2024-0003",
                "full_name": "Nguyễn Minh An",
                "gender": "Nam",
                "dob": "1992-08-16",
                "phone": "0912345678",
                "national_id": "079092014829",
                "bhyt_no": "GD4797931812345",
                "address": "124 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
                "blood_type": "O+",
                "allergies": [{"substance": "Không ghi nhận", "severity": "none"}],
                "conditions": []
            }
        ]

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
            "dob": payload.get("dob", "1990-01-01"),
            "phone": payload.get("phone", ""),
            "national_id": national_id,
            "bhyt_no": payload.get("bhyt_no", ""),
            "address": payload.get("address", ""),
            "blood_type": payload.get("blood_type", "O+"),
            "allergies": [{"substance": payload.get("allergies", "Không ghi nhận"), "severity": "none"}],
            "conditions": []
        }
        self._seed_patients.append(record)
        return pid

    def get_patient_summary(self, external_patient_id: str):
        found = next((p for p in self._seed_patients if p["pid"] == external_patient_id), None)
        if found:
            return {
                "source": "mock",
                "external_patient_id": external_patient_id,
                "conditions": found.get("conditions", []),
                "allergies": found.get("allergies", []),
                "encounters": [],
                "patient": found
            }
        return {
            "source": "mock",
            "external_patient_id": external_patient_id,
            "conditions": [{"code": "DEMO", "display": "Demo condition (not clinical data)"}],
            "allergies": [],
            "encounters": [],
            "warning": "Synthetic data only. Not connected to hospital HIS/EMR."
        }

    def create_encounter_draft(self, payload: dict):
        return {"source": "mock", "status": "not_sent", "payload_preview": payload}
