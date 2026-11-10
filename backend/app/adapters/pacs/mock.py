class MockPACSAdapter:
    name = "mock"
    def list_studies(self, external_patient_id: str):
        return {
            "source": "pacs",
            "external_patient_id": external_patient_id,
            "studies": []
        }
