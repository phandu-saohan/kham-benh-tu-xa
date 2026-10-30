class MockHISAdapter:
    name = "mock"
    def get_patient_summary(self, external_patient_id: str):
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
