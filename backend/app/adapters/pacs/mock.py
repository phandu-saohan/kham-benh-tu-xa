class MockPACSAdapter:
    name = "mock"
    def list_studies(self, external_patient_id: str):
        return {
            "source": "mock",
            "external_patient_id": external_patient_id,
            "studies": [
                {"study_id": "DEMO-STUDY-001", "modality": "US", "description": "Demo ultrasound study", "date": "2026-01-01", "viewer_url": None}
            ],
            "warning": "Synthetic metadata only. No diagnostic images are included."
        }
