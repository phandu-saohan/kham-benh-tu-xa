# HỆ THỐNG KHÁM BỆNH TỪ XA TÍCH HỢP BỆNH ÁN ĐIỆN TỬ (TELEMEDICINE & HIS/EMR)

Ứng dụng WebApp y tế toàn diện (Full-Stack), đáp ứng đầy đủ tiêu chuẩn Thông tư 49/2017, 54/2017, 27/2021, 04/2022/TT-BYT và Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân & e-Consent).

---

## 🌟 CÁC TÍNH NĂNG NỔI BẬT

1. **Đồng bộ Hai chiều Thời gian Thực (Real-Time Bidirectional Synchronization)**:
   - Kết nối qua WebSocket Gateway (`/ws`), mọi thao tác của Bác sĩ (chú thích ảnh PACS, cập nhật SOAP, kê đơn, gửi lệnh đo huyết áp từ xa) lập tức hiển thị trên màn hình Bệnh nhân và ngược lại.
   - Hỗ trợ mở trên nhiều thiết bị cùng lúc (Ví dụ: Bác sĩ trên PC: `http://<ip>:3001/?role=doctor`, Bệnh nhân trên Smartphone: `http://<ip>:3001/?role=patient`).

2. **Trạm Làm Việc Bác Sĩ (Doctor Workstation - 40/60 Split)**:
   - Hội chẩn trực tuyến WebRTC đa điểm (Mời Bác sĩ Tim mạch / Dược sĩ lâm sàng tham gia 3 chiều).
   - Đo đạc & Giám sát Tín hiệu Sinh học IoT: Điện tim ECG Lead II và Ống nghe điện tử kỹ thuật số tích hợp xử lý tín hiệu số DSP (lọc dải tần Tim 20-200Hz và Phổi 100-1000Hz với Web Audio API).
   - AI Medical Scribe: Tự động trích xuất cấu trúc SOAP và gợi ý mã ICD-10 từ hội thoại lâm sàng.
   - Trình đọc ảnh Web PACS DICOM: Điều chỉnh Window Level/Width, thước đo mm, vẽ chú thích đồng bộ trực tiếp.
   - Hệ thống hỗ trợ ra quyết định lâm sàng (CDS Blocker): Tự động phát hiện và ngăn chặn kê đơn thuốc dị ứng (như nhóm Penicillin/Beta-lactam).
   - Ký số Y tế SmartCA (VNPT/Viettel-CA/MISA eSign) và sinh mã Đơn thuốc Quốc gia ([donthuocquocgia.vn](https://donthuocquocgia.vn)).

3. **Cổng Bệnh Nhân (Patient Virtual Care Portal)**:
   - Quy trình khám có hướng dẫn 4 bước: Sàng lọc & ghép nối thiết bị BLE -> Phòng chờ ảo -> Khám Video 2 chiều -> Kế hoạch điều trị & Đơn thuốc.
   - Ghép nối thiết bị y tế qua Web Bluetooth API (GATT 0x1810 Huyết áp, 0x1822 SpO2, 0x1808 Đường huyết).
   - Thanh toán viện phí trực tuyến tự động qua VietQR/Napas247 với Webhook IPN đối soát gạch nợ tức thì.

4. **Tuân thủ Chuẩn Liên thông Y tế**:
   - Xuất gói dữ liệu giám định chi phí KCB BHYT XML 4210 / Quyết định 130/QĐ-BYT.
   - Chuỗi khối kiểm toán (Audit Trail) bất biến băm SHA-256 theo cấp độ 3 Nghị định 85/2016/NĐ-CP.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY TRÊN MÁY CHỦ (PRODUCTION DEPLOYMENT)

### Cách 1: Khởi chạy trực tiếp bằng Node.js / TSX (Đơn giản nhất)
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Build ứng dụng React SPA
npm run build

# 3. Khởi chạy máy chủ Full-Stack (Cả WebApp + WebSocket + REST API)
npm start
```
Ứng dụng sẽ khả dụng tại:
- **Web App**: `http://localhost:3001`
- **Màn hình Bác sĩ**: `http://localhost:3001/?role=doctor`
- **Màn hình Bệnh nhân**: `http://localhost:3001/?role=patient`
- **Kiểm tra trạng thái**: `http://localhost:3001/api/health`

---

### Cách 2: Triển khai Cụm Máy Chủ Docker Enterprise (Bệnh Viện)
Cụm bao gồm:
- **`web-app`**: Ứng dụng Fullstack (Node 22 + React)
- **`livekit`**: WebRTC SFU Server hội chẩn video đa điểm băng thông lớn
- **`orthanc-pacs`**: Máy chủ DICOM PACS lưu trữ phim chụp X-Quang, CT, MRI
- **`postgres-fhir`**: Cơ sở dữ liệu chuẩn HL7 FHIR R4
- **`caddy`**: Reverse Proxy tự động cấp phát HTTPS SSL TLS 1.3 và định tuyến WebSocket

```bash
cd docker
docker compose -f docker-compose.production.yml up -d
```

---

## 📡 DANH SÁCH REST API & WEBSOCKET GATEWAY

| Phương thức | Đường dẫn (Endpoint) | Chức năng |
|---|---|---|
| `GET` | `/api/health` | Kiểm tra tình trạng máy chủ & số client kết nối |
| `GET` | `/api/patients` | Lấy danh sách hàng đợi bệnh nhân & bệnh án |
| `PUT` | `/api/patients/:id/vitals` | Cập nhật sinh hiệu đo từ thiết bị IoT |
| `GET/POST`| `/api/soap/:patientId` | Truy vấn & Lưu trữ bệnh án SOAP + mã ICD-10 |
| `POST` | `/api/prescriptions` | Phát hành đơn thuốc ký số SmartCA liên thông Quốc gia |
| `GET` | `/api/bhyt/xml-4210/:patientId`| Tải bảng kê chi phí KCB BHYT XML 4210 |
| `POST` | `/api/payment/vietqr-webhook` | Webhook IPN ngân hàng tự động gạch nợ viện phí |
| `POST` | `/api/livekit/token` | Cấp JWT Token kết nối phòng họp WebRTC SFU |
| `WS` | `/ws` | Kênh WebSocket đồng bộ hai chiều thời gian thực |
