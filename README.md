# Telemedicine V1.0

Nền tảng khám bệnh từ xa: React + TypeScript + Vite, FastAPI, PostgreSQL, Redis, LiveKit self-hosted.
HIS/EMR và PACS/DICOM dùng mock adapter mặc định. Không giả định API của bệnh viện.

## Thành phần
- `frontend/`: dashboard bệnh nhân/bác sĩ, lịch hẹn, trang phòng video LiveKit, xem kết quả lâm sàng demo.
- `backend/`: FastAPI, JWT auth demo, appointments, telehealth sessions, patient records, billing, HIS/PACS adapters.
- `database/`: Alembic migration.
- `docs/openapi.yaml`: API contract mẫu.
- `tests/`: API smoke tests.
- `infra/`: LiveKit config.
- `docker-compose.yml`: chạy các dịch vụ cốt lõi.

## Yêu cầu
Docker Desktop + Docker Compose plugin. Để chạy test local không dùng Docker: Python 3.11+, Node.js 20+.

## Chạy nhanh
1. Sao chép `.env.example` thành `.env`.
2. Thay tất cả secret mặc định trước khi dùng ngoài máy phát triển.
3. Chạy:
   ```bash
   docker compose up --build -d
   docker compose ps
   ```
4. Backend API: http://localhost:8000/docs
5. Frontend: http://localhost:5173
6. Health: http://localhost:8000/health

Tài khoản demo (chỉ dành cho local/dev):
- Bệnh nhân: `patient@example.test` / `ChangeMe123!`
- Bác sĩ: `doctor@example.test` / `ChangeMe123!`

Seed demo được chạy khi backend khởi động nếu `SEED_DEMO=true`. Không bật seed demo trong production.

## Chạy migrations
Trong Docker:
```bash
docker compose exec api alembic upgrade head
```
Migration đầu tiên được áp dụng tự động khi backend khởi động. Nếu thay đổi schema, tạo migration mới bằng:
```bash
docker compose exec api alembic revision --autogenerate -m "describe change"
docker compose exec api alembic upgrade head
```

## Test
```bash
docker compose exec api pytest -q
```
Hoặc chạy backend local:
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

## Tích hợp HIS/EMR thật
- Mặc định `HIS_ADAPTER=mock`. Mock trả dữ liệu giả, không lấy dữ liệu bệnh nhân thật.
- Khi có tài liệu API: triển khai adapter mới trong `backend/app/adapters/his/`, định nghĩa timeout, retry, idempotency, mapping mã bệnh nhân, logging đã khử dữ liệu nhạy cảm.
- Không kết nối trực tiếp database HIS nếu chưa được phê duyệt. Ưu tiên API chính thức/FHIR.
- Xác minh ánh xạ mã bệnh nhân và mã lần khám trước khi ghi dữ liệu.
- Các endpoint tích hợp hiện chỉ là adapter boundary; chưa đồng bộ hoặc ghi hồ sơ vào HIS thật.

## Tích hợp PACS/DICOM
- Mặc định `PACS_ADAPTER=mock`.
- Với PACS hỗ trợ DICOMweb, cấu hình QIDO-RS để tìm study và WADO-RS để truy xuất ảnh; yêu cầu PACS/Orthanc/OHIF cụ thể trước khi viết adapter production.
- Không đưa URL/token PACS nhạy cảm ra frontend. Backend cần kiểm tra quyền và cấp URL/token ngắn hạn nếu kiến trúc PACS cho phép.
- Demo hiện hiển thị metadata mock, không hiển thị ảnh DICOM chẩn đoán thực tế.

## LiveKit
- LiveKit local dùng cấu hình `infra/livekit.yaml`; frontend xin token từ backend.
- Cấu hình domain public, TLS, UDP port range, TURN/TLS, firewall và load balancing trước khi triển khai private cloud.
- Không mở LiveKit Admin API ra Internet.
- Video call trong bản scaffold cần được kiểm thử trên trình duyệt và mạng thực tế; chưa bao gồm ghi hình.

## Lưu ý triển khai production
1. Thay `SECRET_KEY`, mật khẩu database, LiveKit API secret và mọi credential.
2. Dùng TLS ở reverse proxy; không dùng HTTP cho bệnh nhân thật.
3. Thêm SSO/MFA, RBAC chi tiết theo quan hệ điều trị, consent, audit append-only, rate limiting và quản lý secrets.
4. Đánh giá pháp lý, an toàn thông tin và quy trình telehealth của bệnh viện.
5. Bổ sung quy trình ký số, ký đơn thuốc, đối soát thanh toán và hoàn tiền theo hệ thống được bệnh viện phê duyệt.
6. Kiểm thử tải với 50/100/150 phiên đồng thời, kiểm tra băng thông, CPU, packet loss, TURN và phục hồi sự cố.
7. Không dùng dữ liệu thật trong môi trường demo/test.

## Cấu trúc
```text
telemedicine-v1/
  backend/
  frontend/
  database/
  docs/
  infra/
  tests/
  docker-compose.yml
  .env.example
```
