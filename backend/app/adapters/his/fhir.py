"""
Adapter chuyển đổi hồ sơ bệnh án sang chuẩn HL7 FHIR R4
Tương thích với các hệ thống EMR/HIS hiện đại của các bệnh viện và tiêu chuẩn trao đổi dữ liệu y tế quốc tế.
"""
from datetime import datetime, timezone

class FHIRHISAdapter:
    name = "fhir_r4"
    
    @staticmethod
    def build_fhir_bundle(appointment: dict, clinical_record: dict, patient: dict, doctor: dict, prescription: str = "") -> dict:
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # 1. FHIR Resource: Patient
        patient_resource = {
            "resourceType": "Patient",
            "id": f"pat-{patient.get('id')}",
            "identifier": [
                {
                    "system": "http://careconnect.vn/identifiers/pid",
                    "value": patient.get("external_patient_id") or f"P-{patient.get('id')}"
                }
            ],
            "name": [{"use": "official", "text": patient.get("full_name")}],
            "telecom": [{"system": "phone", "value": patient.get("phone_number") or ""}]
        }
        
        # 2. FHIR Resource: Encounter (Buổi khám Telehealth)
        encounter_resource = {
            "resourceType": "Encounter",
            "id": f"enc-{appointment.get('id')}",
            "status": "finished" if appointment.get("status") == "completed" else "in-progress",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "VR",
                "display": "Virtual visit (Telemedicine)"
            },
            "subject": {"reference": f"Patient/pat-{patient.get('id')}"},
            "participant": [
                {
                    "individual": {
                        "display": doctor.get("full_name")
                    }
                }
            ],
            "period": {
                "start": appointment.get("starts_at")
            },
            "reasonCode": [
                {"text": appointment.get("reason")}
            ]
        }
        
        # 3. FHIR Resource: Condition (Chẩn đoán bệnh kèm mã ICD-10)
        condition_resource = {
            "resourceType": "Condition",
            "id": f"cond-{clinical_record.get('id', appointment.get('id'))}",
            "subject": {"reference": f"Patient/pat-{patient.get('id')}"},
            "encounter": {"reference": f"Encounter/enc-{appointment.get('id')}"},
            "code": {
                "coding": [
                    {
                        "system": "http://hl7.org/fhir/sid/icd-10",
                        "code": clinical_record.get("icd10_code") or "R69",
                        "display": clinical_record.get("icd10_name") or "Chưa phân loại"
                    }
                ],
                "text": clinical_record.get("diagnosis") or clinical_record.get("icd10_name") or ""
            },
            "note": [
                {"text": f"Triệu chứng: {clinical_record.get('symptoms', '')}"},
                {"text": f"Tiền sử dị ứng: {clinical_record.get('allergies', '')}"},
                {"text": f"Ghi chú lâm sàng: {clinical_record.get('clinical_notes', '')}"}
            ]
        }
        
        # 4. FHIR Resource: MedicationRequest (Đơn thuốc điện tử)
        entries = [
            {"resource": patient_resource},
            {"resource": encounter_resource},
            {"resource": condition_resource}
        ]
        
        if prescription:
            med_resource = {
                "resourceType": "MedicationRequest",
                "id": f"med-{appointment.get('id')}",
                "status": "active",
                "intent": "order",
                "subject": {"reference": f"Patient/pat-{patient.get('id')}"},
                "encounter": {"reference": f"Encounter/enc-{appointment.get('id')}"},
                "authoredOn": now_iso,
                "dosageInstruction": [
                    {"text": prescription}
                ]
            }
            entries.append({"resource": med_resource})
            
        return {
            "resourceType": "Bundle",
            "type": "collection",
            "timestamp": now_iso,
            "entry": entries
        }
