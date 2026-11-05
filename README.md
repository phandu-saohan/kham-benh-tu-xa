# CareConnect Telemedicine V1.2
### Nền tảng Bệnh viện Số & Khám chữa bệnh Từ xa Đạt chuẩn Quốc gia

> 📖 **Xem tài liệu hướng dẫn sử dụng và danh mục tính năng chi tiết tại:** [HUONG_DAN_SU_DUNG.md](./HUONG_DAN_SU_DUNG.md)

CareConnect Telemedicine V1.2 là hệ thống khám bệnh từ xa hoàn chỉnh, kết hợp giao diện Web Responsive và ứng dụng Native Mobile Android (`vn.careconnect.telemedicine.patient`), bao gồm đầy đủ các phân hệ cho **Bệnh nhân**, **Bác sĩ**, **Điều dưỡng tiếp đón (Triage)** và **Ban Quản trị Bệnh viện**.

---

## 🌟 CÁC PHÂN HỆ VÀ TÍNH NĂNG NỔI BẬT

### 1. Phân hệ Bệnh nhân (Patient Portal & Mobile App)
- **Định danh điện tử VNeID Mức 2 & Xác thực OTP Firebase:** Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
- **Thẻ BHYT Điện tử Chuẩn BHXH Việt Nam:** Tra cứu thông tin thẻ, mức hưởng (80%, 95%, 100%), tự động giảm trừ chi phí khám trực tiếp.
- **Đặt lịch khám chuyên khoa trực tuyến:** Chọn chuyên khoa, chọn bác sĩ, khung giờ khám và nhận phòng khám video tức thì.
- **Phòng khám Video HD (LiveKit WebRTC):** Hội chẩn trực tuyến 2 chiều với bác sĩ, kết nối riêng tư, độ trễ cực thấp.
- **Module Kết nối Thiết bị Y tế Thông minh (Smart Devices Hub):**
  - Đồng bộ số đo sinh hiệu qua **Bluetooth Low Energy (SIG GATT)** từ các thiết bị đạt chuẩn FDA/CE:
    - *Omron HEM-7361T Smart BP Monitor* (Huyết áp & Nhịp tim)
    - *Roche Accu-Chek Instant BLE* (Đường huyết mao mạch)
    - *Wellue FS20F Bluetooth Pulse Oximeter* (SpO2 & Nhịp mạch)
    - *Braun ThermoScan 7 Infrared Ear* (Nhiệt độ cơ thể)
    - *Tanita BC-401 Body Composition Scale* (Cân nặng, BMI, Chỉ số cơ thể)
  - **Cảm biến quang học Camera PPG (Optical Bio-Sensor):** Đo nhịp tim và ước tính SpO2 trực tiếp bằng camera và đèn flash điện thoại/máy tính.
  - Hỗ trợ nhập số đo thủ công và tự động tính toán chỉ số BMI, MAP.
- **Hồ sơ Sức khỏe Gia đình (Family Health Vault):** Quản lý y bạ người thân (con nhỏ, cha mẹ, vợ chồng), lưu trữ mã BHYT, tiền sử dị ứng, bệnh nền và tính năng **"Đặt lịch khám ngay"** cho từng thành viên.
- **Thanh toán Viện phí VietQR:** Tạo mã QR động chuẩn Napas 247, tự động kiểm tra số dư và kích hoạt ca khám.

### 2. Phân hệ Bác sĩ (Doctor Consultation Workspace)
- **Hàng đợi khám bệnh thông minh:** Quản lý bệnh nhân theo thời gian hẹn và mức độ ưu tiên từ bàn điều dưỡng.
- **Buồng làm việc Video Call tích hợp EMR:** Bác sĩ vừa khám vừa theo dõi dữ liệu sinh hiệu từ thiết bị của bệnh nhân theo thời gian thực.
- **Hồ sơ Bệnh án Điện tử (EMR - Chuẩn SOAP):** Ghi nhận triệu chứng, chẩn đoán xác định kèm mã quốc tế **ICD-10**.
- **Kê đơn thuốc điện tử & Ký số SmartCA:** Cấp mã đơn thuốc quốc gia, ký số điện tử hợp chuẩn Bộ Y Tế và xuất file PDF.
- **Xem Cận lâm sàng & Ảnh Y khoa DICOM PACS:** Đọc kết quả xét nghiệm và ảnh X-quang, CT, MRI ngay trong phòng khám.

### 3. Phân hệ Điều dưỡng (Nurse Triage Desk)
- **Bàn Tiếp đón & Phân luồng Bệnh nhân:** Tiếp nhận ca khám, kiểm tra thẻ BHYT và tình trạng viện phí.
- **Sàng lọc Sinh hiệu Sơ bộ:** Tiếp nhận hoặc đo chỉ số sinh tồn ban đầu, chấm điểm nguy cơ phân loại (Triage).
- **Điều phối Buồng khám:** Chuyển bệnh nhân vào buồng khám của bác sĩ chuyên khoa tương ứng.

### 4. Phân hệ Quản trị Bệnh viện & Giám định (Admin Dashboard)
- **Báo cáo thống kê toàn viện:** Lượt khám, doanh thu, thời gian chờ, tỷ lệ hài lòng theo thời gian thực.
- **Giám định BHYT & Trích xuất XML 4210:** Tạo và xuất các bảng dữ liệu XML 4210 / XML 130 phục vụ thanh quyết toán bảo hiểm y tế điện tử.
- **Đối soát Viện phí:** Kiểm soát giao dịch VietQR, hoàn tiền và đối soát kế toán.
- **Quản lý danh mục:** Quản lý tài khoản bác sĩ, điều dưỡng, chuyên khoa, phòng khám, bảng giá dịch vụ và kho thuốc.

---

## 🔑 TÀI KHOẢN MẪU TRẢI NGHIỆM

Đăng nhập trên Web hoặc Mobile App với mật khẩu mặc định: `ChangeMe123!`

| Vai trò | Email đăng nhập | Mật khẩu | Phân hệ trải nghiệm |
| :--- | :--- | :--- | :--- |
| **Bệnh nhân** | `patient@example.test` | `ChangeMe123!` | Đặt lịch khám, kết nối thiết bị BLE, đo PPG, xem BHYT, thanh toán VietQR |
| **Bác sĩ** | `doctor@example.test` | `ChangeMe123!` | Buồng khám Video HD, xem sinh hiệu EMR, kê đơn ký số SmartCA, PACS |
| **Điều dưỡng** | `nurse@example.test` | `ChangeMe123!` | Bàn tiếp đón, chấm điểm sàng lọc Triage, phân buồng bác sĩ |
| **Quản trị viên** | `admin@example.test` | `ChangeMe123!` | Quản trị toàn viện, xuất XML 4210 BHYT, đối soát VietQR |

---

## 🚀 ĐỊA CHỈ TRUY CẬP

- **Web Production:** [https://telemed.medicalcenter.vn](https://telemed.medicalcenter.vn)
- **API Swagger Documentation:** `https://telemed.medicalcenter.vn/docs`
- **Android App:** Package `vn.careconnect.telemedicine.patient` (Trải nghiệm trực tiếp qua Android Device Hub).

---

## 💻 HƯỚNG DẪN KHỞI CHẠY (LOCAL & DOCKER)

### Chạy bằng Docker Compose:
```bash
docker compose up --build -d
docker compose ps
```
- Frontend: http://localhost:5173
- Backend API Docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Chạy Local Development:
```bash
# 1. Backend
cd backend
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend
cd frontend
npm install
npm run dev
```

### Build Android App:
```bash
cd frontend
npm run build:mobile
cd android
.\gradlew.bat installDebug # Cài đặt trực tiếp lên điện thoại hoặc Android Emulator
```
