# Mock HIS Server

HIS/EMR **tổng hợp (100% synthetic data)** chạy local để test tích hợp telemedicine ↔ HIS. Không dùng dữ liệu bệnh nhân thật, không thay thế HIS production.

## Chạy nhanh

### Qua Docker Compose (cùng stack telemedicine)
```bash
docker compose up --build -d mock-his
# API docs: http://localhost:8100/docs
curl http://localhost:8100/health
```

### Chạy local không Docker
```bash
cd mock_his
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --port 8100
# Test: pytest tests_smoke.py -q
```

## Config phía telemedicine

Thêm vào `.env` của backend:
```env
HIS_ADAPTER=http
HIS_BASE_URL=http://mock-his:8100   # trong docker; ngoài docker: http://localhost:8100
HIS_API_KEY=his-dev-key-change-me
```
Adapter `backend/app/adapters/his/http_adapter.py` sẽ được `get_his_adapter()` trả ra thay cho mock.

## API Surface

| Endpoint | Mục đích test |
|---|---|
| `GET /health` | Health check (public) |
| `GET /api/departments`, `GET /api/doctors` | đồng bộ khoa/bác sĩ |
| `GET /api/patients?search=` | tra cứu PID/tên/SĐT/CCCD |
| `GET /api/patients/{pid}` | summary: chẩn đoán, dị ứng, lần khám |
| `POST /api/patients` | ánh xạ/tạo PID mới |
| `POST /api/encounters` | đăng ký lần khám telemedicine vào HIS |
| `POST /api/encounters/{id}/documents` | đẩy hồ sơ/PDF |
| `POST /api/prescriptions` | đẩy đơn thuốc (kèm mã đơn thuốc quốc gia) |
| `POST /fhir` | accept Bundle FHIR R4 (Patient/Encounter/Condition/MedicationRequest) |
| `GET /fhir/Patient/{id}`, `GET /fhir/Encounter?patient=` | read-back theo FHIR |
| `GET /admin/stats`, `GET /admin/events` | xem telemedicine đã đẩy gì qua endpoint nào |

Tất cả endpoint ngoài public đều yêu cầu header `X-API-Key`.

## Seed data

3 bệnh nhân tổng hợp: `HIS-2024-0001` (cao huyết áp, dị ứng Penicillin), `HIS-2024-0002`, `HIS-2024-0003` (nhi, hen suyễn); 5 khoa, 4 bác sĩ, 2 lần khám lịch sử. Reset về seed mặc định: xóa file `his.db`.
