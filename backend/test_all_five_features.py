import sys
import json
import requests

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "https://app-bypass-back-end-circuit-7mgyyh-664221-72-61-123-73.sslip.io"
FIREBASE_API_KEY = "AIzaSyB2MDpw-mEG4lT_ZhLejdFIc-i02MDsQ4c"

def run_tests():
    print(f"=== VERIFYING ALL 5 ADVANCED HEALTHCARE MODULES AT: {BASE_URL} ===\n")
    
    # 0. Core Health
    h = requests.get(f"{BASE_URL}/health", timeout=10)
    print(f"[OK] 0. Health check: status={h.status_code}, service={h.json().get('status')}")
    assert h.status_code == 200

    # 1. Doctor Login
    doc_res = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": "doctor@example.test",
        "password": "ChangeMe123!"
    })
    assert doc_res.status_code == 200, f"Doctor login failed: {doc_res.text}"
    doc_token = doc_res.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    doc_info = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=doc_headers).json()
    doc_id = doc_info["id"]
    print(f"[OK] 1. Doctor login successful: {doc_info['full_name']} (ID={doc_id})")

    # 2. Patient Firebase Login
    url_send = f"https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key={FIREBASE_API_KEY}"
    res_send = requests.post(url_send, json={"phoneNumber": "+84933413486"})
    session_info = res_send.json()["sessionInfo"]

    url_verify = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key={FIREBASE_API_KEY}"
    res_verify = requests.post(url_verify, json={"sessionInfo": session_info, "code": "888999"})
    id_token = res_verify.json()["idToken"]

    fb_auth = requests.post(f"{BASE_URL}/api/v1/auth/firebase/verify-token", json={"id_token": id_token})
    assert fb_auth.status_code == 200, f"Patient login failed: {fb_auth.text}"
    pat_token = fb_auth.json()["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    patient_id = fb_auth.json()["user"]["id"]
    print(f"[OK] 2. Patient login successful: ID={patient_id}, Name={fb_auth.json()['user']['full_name']}")

    # Get or create appointment ID for testing
    appts = requests.get(f"{BASE_URL}/api/v1/appointments", headers=pat_headers).json()
    if not appts:
        c_res = requests.post(f"{BASE_URL}/api/v1/appointments", headers=pat_headers, json={
            "doctor_id": doc_id,
            "starts_at": "2026-11-05T09:00:00Z",
            "department": "Nội tổng quát",
            "reason": "Khám sức khỏe tổng quát và theo dõi đường huyết"
        })
        assert c_res.status_code == 200, f"Create appointment failed: {c_res.text}"
        appt_id = c_res.json()["id"]
    else:
        appt_id = appts[0]["id"]
    print(f"[INFO] Using Appointment ID: {appt_id}\n")

    # ------------------------------------------------------------------
    # MODULE 2: Cổng Giám định BHYT Quốc gia (XML 4210 & VssID)
    # ------------------------------------------------------------------
    print("--- [MODULE 2: CỔNG GIÁM ĐỊNH BHYT QUỐC GIA XML 4210] ---")
    claim_res = requests.get(f"{BASE_URL}/api/v1/bhyt/claims/{appt_id}", headers=doc_headers)
    assert claim_res.status_code == 200, f"Get BHYT claim failed: {claim_res.text}"
    claim = claim_res.json()
    print(f"  • MA_LK: {claim['ma_lk']} | Thẻ BHYT: {claim['ma_the_bhyt']} ({claim['muc_huong']}%)")
    print(f"  • Tổng chi phí: {claim['t_tongchi']:,.0f} đ | Quỹ BHYT chi: {claim['t_bhyttt']:,.0f} đ | Bệnh nhân trả: {claim['t_bntt']:,.0f} đ")

    xml_res = requests.get(f"{BASE_URL}/api/v1/bhyt/xml4210/{appt_id}", headers=doc_headers)
    assert xml_res.status_code == 200, f"Export XML 4210 failed: {xml_res.text}"
    xml_pkg = xml_res.json()
    assert "<TONG_HOP>" in xml_pkg["xml1_tonghop"], "Missing XML 1 TONG_HOP!"
    assert "<CHITIET_THUOC>" in xml_pkg["xml2_chitietthuoc"], "Missing XML 2 CHITIET_THUOC!"
    assert "<CHITIET_DVKT>" in xml_pkg["xml3_chitietdvkt"], "Missing XML 3 CHITIET_DVKT!"
    assert "<CHITIET_CLS>" in xml_pkg["xml4_chitietcls"], "Missing XML 4 CHITIET_CLS!"
    assert "<CHITIET_DIENBIEN_BENH>" in xml_pkg["xml5_dienbien"], "Missing XML 5 DIENBIEN_BENH!"
    print("  • Đã kiểm định toàn vẹn 5 bảng XML theo Quyết định 4210/QĐ-BYT (XML 1 - 5)")

    submit_res = requests.post(f"{BASE_URL}/api/v1/bhyt/claims/{appt_id}/submit", headers=doc_headers)
    assert submit_res.status_code == 200, f"Submit claim failed: {submit_res.text}"
    submit_data = submit_res.json()
    print(f"  • Tiếp nhận Cổng Giám định BHYT Quốc gia: Mã {submit_data['gdbhyt_code']} (Status={submit_data['status']})")
    print("  => MODULE 2 PASSED 100%\n")

    # ------------------------------------------------------------------
    # MODULE 3: Hội chẩn Liên viện & Đa chuyên khoa (Multi-Doctor)
    # ------------------------------------------------------------------
    print("--- [MODULE 3: HỘI CHẨN LIÊN VIỆN & ĐA CHUYÊN KHOA] ---")
    invite_res = requests.post(f"{BASE_URL}/api/v1/appointments/{appt_id}/multi-doctor/invite", headers=doc_headers, json={
        "doctor_name": "PGS.TS.BS Nguyễn Văn Thông",
        "hospital_name": "Bệnh viện Bạch Mai - Tuyến Trung Ương",
        "specialty": "Hô hấp & Phổi can thiệp",
        "role": "specialist"
    })
    assert invite_res.status_code == 200, f"Invite specialist failed: {invite_res.text}"
    member = invite_res.json()
    member_id = member["id"]
    print(f"  • Đã gửi thư mời hội chẩn tới: {member['doctor_name']} ({member['specialty']} - {member['hospital_name']})")

    opinion_res = requests.post(f"{BASE_URL}/api/v1/appointments/{appt_id}/multi-doctor/opinion?member_id={member_id}", headers=doc_headers, json={
        "clinical_opinion": "Đồng thuận chẩn đoán viêm phổi thùy dưới phải. Đề xuất phác đồ: Amoxicillin/Clavulanate 1g x 2 lần/ngày kèm theo dõi sát SpO2 tại nhà."
    })
    assert opinion_res.status_code == 200, f"Submit opinion failed: {opinion_res.text}"
    print("  • Chuyên gia đã gửi biên bản ý kiến hội chẩn thành công vào bệnh án")

    members_list = requests.get(f"{BASE_URL}/api/v1/appointments/{appt_id}/multi-doctor/members", headers=doc_headers).json()
    assert len(members_list) >= 2, "Members count mismatch!"
    print(f"  • Tổng số thành viên trong Hội đồng Hội chẩn: {len(members_list)}")
    print("  => MODULE 3 PASSED 100%\n")

    # ------------------------------------------------------------------
    # MODULE 4: Giám sát Sinh hiệu Từ xa (RPM IoT)
    # ------------------------------------------------------------------
    print("--- [MODULE 4: GIÁM SÁT SINH HIỆU TỪ XA (RPM IoT)] ---")
    rpm_res = requests.post(f"{BASE_URL}/api/v1/rpm/vitals", headers=pat_headers, json={
        "device_type": "blood_pressure",
        "device_name": "Omron HEM-7600T Smart Bluetooth",
        "connection_method": "bluetooth_ble",
        "systolic": 132,
        "diastolic": 85,
        "pulse": 76,
        "glucose_value": 5.9,
        "spo2_percent": 98.0
    })
    assert rpm_res.status_code == 200, f"Record RPM vitals failed: {rpm_res.text}"
    vital_data = rpm_res.json()
    print(f"  • Đã nhận gói tin đo BLE: Huyết áp={vital_data['systolic']}/{vital_data['diastolic']} mmHg, Mạch={vital_data['pulse']} bpm, SpO2={vital_data['spo2_percent']}%")

    vitals_history = requests.get(f"{BASE_URL}/api/v1/rpm/vitals/{patient_id}", headers=doc_headers).json()
    assert len(vitals_history) > 0, "No vitals in history!"
    print(f"  • Lịch sử sinh hiệu đã lưu trữ: {len(vitals_history)} bản ghi đo an toàn")
    print("  => MODULE 4 PASSED 100%\n")

    # ------------------------------------------------------------------
    # MODULE 5: Hồ sơ Sức khỏe Gia đình (Family Health Vault)
    # ------------------------------------------------------------------
    print("--- [MODULE 5: HỒ SƠ SỨC KHỎE GIA ĐÌNH (FAMILY HEALTH VAULT)] ---")
    fam_members = requests.get(f"{BASE_URL}/api/v1/family-members", headers=pat_headers).json()
    print(f"  • Số thành viên gia đình ban đầu: {len(fam_members)}")

    new_fam_res = requests.post(f"{BASE_URL}/api/v1/family-members", headers=pat_headers, json={
        "full_name": "Nguyễn Hoàng Nam (Em trai)",
        "relationship": "sibling",
        "gender": "male",
        "date_of_birth": "1995-04-12",
        "phone_number": "0988776655",
        "bhyt_code": "DN4797931888999",
        "blood_group": "B+",
        "allergies": "Không có dị ứng",
        "chronic_conditions": "Khỏe mạnh"
    })
    assert new_fam_res.status_code == 200, f"Create family member failed: {new_fam_res.text}"
    new_fam = new_fam_res.json()
    print(f"  • Đã thêm thành viên mới: {new_fam['full_name']} (Mã BHYT: {new_fam['bhyt_code']}, Nhóm máu: {new_fam['blood_group']})")

    fam_members_updated = requests.get(f"{BASE_URL}/api/v1/family-members", headers=pat_headers).json()
    assert len(fam_members_updated) > len(fam_members), "Family members count did not increase!"
    print(f"  • Tổng hồ sơ gia đình hiện hành: {len(fam_members_updated)} người thân")
    print("  => MODULE 5 PASSED 100%\n")

    # ------------------------------------------------------------------
    # MODULE 6: AI PACS Hỗ trợ Chẩn đoán Hình ảnh (AI Copilot)
    # ------------------------------------------------------------------
    print("--- [MODULE 6: AI PACS HỖ TRỢ CHẨN ĐOÁN HÌNH ẢNH (AI COPILOT)] ---")
    ai_pacs_res = requests.post(f"{BASE_URL}/api/v1/pacs/ai-analyze", headers=doc_headers, json={
        "appointment_id": appt_id,
        "dicom_study_id": "STUDY-CXR-2026-88",
        "modality": "DX",
        "body_part": "CHEST"
    })
    assert ai_pacs_res.status_code == 200, f"AI PACS analyze failed: {ai_pacs_res.text}"
    ai_pacs = ai_pacs_res.json()
    print(f"  • AI Model: {ai_pacs['ai_model_name']}")
    print(f"  • Phát hiện chính: {ai_pacs['primary_finding']} (Confidence: {int(ai_pacs['confidence_score']*100)}%)")
    print(f"  • Danh sách bệnh lý nghi ngờ: {len(ai_pacs['findings'])} tổn thương")
    for f in ai_pacs['findings'][:2]:
        print(f"    - {f['pathology']}: {int(f['probability']*100)}% ({f['location']})")
    print(f"  • Bounding boxes (Grad-CAM): {len(ai_pacs['heatmap_regions'])} vùng nhiệt")

    feedback_res = requests.post(f"{BASE_URL}/api/v1/pacs/ai-feedback/{ai_pacs['id']}", headers=doc_headers, json={
        "doctor_concurrence": "approved",
        "doctor_feedback": "Đồng thuận cao với AI về vùng đông đặc thùy dưới phổi phải."
    })
    assert feedback_res.status_code == 200, f"AI PACS feedback failed: {feedback_res.text}"
    print(f"  • Bác sĩ gửi đánh giá đồng thuận: APPROVED (Thành công)")
    print("  => MODULE 6 PASSED 100%\n")

    print("==================================================================")
    print("🎉 TẤT CẢ 5 PHÂN HỆ Y TẾ NÂNG CAO ĐÃ ĐƯỢC KIỂM ĐỊNH HOÀN TOÀN THÀNH CÔNG TRÊN PRODUCTION DOKPLOY!")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
