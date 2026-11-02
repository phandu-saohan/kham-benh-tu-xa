import sys
import json
import requests

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "https://app-bypass-back-end-circuit-7mgyyh-664221-72-61-123-73.sslip.io"
FIREBASE_API_KEY = "AIzaSyB2MDpw-mEG4lT_ZhLejdFIc-i02MDsQ4c"

def run_test():
    print(f"=== Testing Production API at: {BASE_URL} ===")
    
    # 1. Health check
    h = requests.get(f"{BASE_URL}/health", timeout=10)
    print(f"1. /health -> {h.status_code}: {h.json()['status']}")
    assert h.status_code == 200, "Health check failed"

    # 2. Login as Doctor
    doc_login = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": "doctor@example.test",
        "password": "ChangeMe123!"
    })
    print(f"2. Doctor login -> {doc_login.status_code}")
    assert doc_login.status_code == 200, f"Doctor login failed: {doc_login.text}"
    doc_token = doc_login.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # 3. Login as Patient via Firebase Phone Auth
    url_send = f"https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key={FIREBASE_API_KEY}"
    res_send = requests.post(url_send, json={"phoneNumber": "+84933413486"})
    session_info = res_send.json()["sessionInfo"]

    url_verify = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key={FIREBASE_API_KEY}"
    res_verify = requests.post(url_verify, json={"sessionInfo": session_info, "code": "888999"})
    id_token = res_verify.json()["idToken"]

    fb_auth = requests.post(f"{BASE_URL}/api/v1/auth/firebase/verify-token", json={"id_token": id_token})
    print(f"3. Patient Firebase login -> {fb_auth.status_code}")
    assert fb_auth.status_code == 200, f"Patient login failed: {fb_auth.text}"
    pat_token = fb_auth.json()["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    patient_id = fb_auth.json()["user"]["id"]
    print(f"   Patient ID: {patient_id}, Name: {fb_auth.json()['user']['full_name']}")

    # 4. Get or create an appointment for this patient
    my_appts = requests.get(f"{BASE_URL}/api/v1/appointments", headers=pat_headers)
    appts = my_appts.json()
    print(f"4. Patient appointments found: {len(appts)}")
    if not appts:
        print("Creating an appointment for testing...")
        c_res = requests.post(f"{BASE_URL}/api/v1/appointments", headers=pat_headers, json={
            "doctor_id": 1, # BS.CKII Tran Minh
            "starts_at": "2026-11-05T09:00:00Z",
            "department": "Nội tổng quát",
            "reason": "Kiểm tra theo dõi kết quả xét nghiệm định kỳ"
        })
        assert c_res.status_code == 200, f"Create appointment failed: {c_res.text}"
        appt_id = c_res.json()["id"]
    else:
        appt_id = appts[0]["id"]
    print(f"   Selected appointment ID: {appt_id}")

    # 5. Doctor shares a lab result
    share_payload = {
        "report_id": "XN-2026-9921",
        "report_name": "Công thức máu toàn phần (CBC) & HbA1c",
        "category_name": "Xét nghiệm Huyết học & Sinh hóa",
        "conclusion": "Bình thường - Kiểm soát đường huyết tốt",
        "summary_text": "Bạch cầu: 6.8 K/uL (Bình thường), HbA1c: 6.1% (Kiểm soát tốt), Glucose đói: 5.4 mmol/L. BS khuyên tiếp tục duy trì chế độ dinh dưỡng hiện tại."
    }
    share_res = requests.post(f"{BASE_URL}/api/v1/appointments/{appt_id}/share-lab-result", headers=doc_headers, json=share_payload)
    print(f"5. Doctor share lab result -> {share_res.status_code}: {share_res.json()}")
    assert share_res.status_code == 200, f"Share lab result failed: {share_res.text}"

    # 6. Retrieve visit event history / timeline
    history_res = requests.get(f"{BASE_URL}/api/v1/appointments/{appt_id}/history", headers=doc_headers)
    print(f"6. Visit event history -> {history_res.status_code}")
    assert history_res.status_code == 200, "Get appointment history failed"
    events = history_res.json()
    print(f"   Recorded timeline events count: {len(events)}")
    for ev in events[-3:]:
        print(f"   - [{ev['created_at']}] Action: {ev['action']} | Actor: {ev['actor_name']} ({ev['actor_role']}) | Notes: {ev['notes']}")
    
    # Verify share_lab event exists
    share_events = [e for e in events if e["action"] == "share_lab"]
    assert len(share_events) > 0, "No share_lab event recorded in timeline!"

    # 7. Check Patient Notifications
    notif_res = requests.get(f"{BASE_URL}/api/v1/notifications", headers=pat_headers)
    print(f"7. Patient notifications -> {notif_res.status_code}")
    assert notif_res.status_code == 200, "Get notifications failed"
    data = notif_res.json()
    notifs = data if isinstance(data, list) else data.get("items", [])
    lab_notifs = [n for n in notifs if n.get("category") == "paraclinical" or "xét nghiệm" in n.get("title", "").lower()]
    print(f"   Found {len(lab_notifs)} paraclinical notifications for patient:")
    if lab_notifs:
        print(f"   Latest: '{lab_notifs[0]['title']}' - {lab_notifs[0]['message']}")
    assert len(lab_notifs) > 0, "No lab notifications found for patient!"

    # 8. Test patient full consultation history
    con_hist_res = requests.get(f"{BASE_URL}/api/v1/patients/{patient_id}/consultation-history", headers=doc_headers)
    print(f"8. Patient full consultation history -> {con_hist_res.status_code}")
    assert con_hist_res.status_code == 200, "Get consultation history failed"
    con_hist = con_hist_res.json()
    print(f"   Patient past consultations count: {len(con_hist)}")
    for ch in con_hist[:2]:
        print(f"   - Appt #{ch['appointment_id']} ({ch['starts_at']}): Status={ch['status']}, Doctor={ch['doctor_name']}, Signed={ch['is_signed']}, Events={len(ch.get('events', []))}")

    print("\n✅ ALL TESTS PASSED SUCCESSFULLY ON PRODUCTION DOKPLOY!")

if __name__ == "__main__":
    run_test()
