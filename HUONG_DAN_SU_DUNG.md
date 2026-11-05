# HƯỚNG DẪN SỬ DỤNG VÀ DANH MỤC TÍNH NĂNG TOÀN DIỆN
## HỆ THỐNG BỆNH VIỆN SỐ & KHÁM CHỮA BỆNH TỪ XA CARECONNECT (TELEMEDICINE V1.2)

---

## 📌 1. TỔNG QUAN HỆ THỐNG

**CareConnect Telemedicine V1.2** là nền tảng Bệnh viện số & Khám chữa bệnh từ xa toàn diện, đạt chuẩn kỹ thuật của Bộ Y Tế và tích hợp các công nghệ y tế điện tử tiên tiến:
- **Khám từ xa Video HD thời gian thực:** WebRTC qua LiveKit Self-hosted, độ trễ cực thấp, bảo mật kênh truyền y tế.
- **Trung tâm Thiết bị Y tế Thông minh & RPM IoT:** Tự động đồng bộ số đo sinh hiệu từ các máy đo đạt chuẩn FDA/CE qua Bluetooth SIG GATT (Huyết áp Omron, Đường huyết Accu-Chek, SpO2 Wellue, Nhiệt kế Braun, Cân phân tích Tanita) và cảm biến quang học Camera PPG.
- **Hồ sơ Bệnh án Điện tử (EMR) & Đơn thuốc Quốc gia:** Ký số SmartCA, cấp mã đơn thuốc quốc gia, tra cứu mã ICD-10 và xuất phiếu khám/đơn thuốc PDF có giá trị pháp lý.
- **Giám định BHYT Điện tử & Chuẩn XML 4210:** Tra cứu mã mức hưởng BHYT (80%, 95%, 100%), tự động trừ chiết khấu bảo hiểm và xuất gói dữ liệu giám định XML 4210/XML 130.
- **Cổng Thanh toán VietQR Napas 247:** Tạo mã QR thanh toán viện phí động, tự động đối soát số dư thời gian thực.
- **Đa nền tảng:** Web ứng dụng tối ưu Desktop/Tablet và Native Mobile Android App (`vn.careconnect.telemedicine.patient`).

---

## 📱 2. PHÂN HỆ DÀNH CHO BỆNH NHÂN (PATIENT PORTAL & MOBILE APP)

### 2.1. Đăng nhập & Xác thực Danh tính
- **Đăng nhập nhanh:** Hỗ trợ đăng nhập qua Email/Mật khẩu hoặc Số điện thoại.
- **Xác thực OTP & Định danh VNeID:** Tích hợp mô phỏng xác thực OTP Firebase và định danh mức 2 (Nghị định 13/2023/NĐ-CP).

### 2.2. Màn hình Tổng quan (Dashboard)
- **Lời chào cá nhân hóa:** Hiển thị mã bệnh nhân (PID), trạng thái định danh và cảnh báo lịch khám sắp diễn ra.
- **Phòng chờ trực tuyến:** Nhắc nhở ca khám sắp tới kèm nút bấm **"Vào phòng chờ trực tuyến"** / **"Vào phòng khám Video HD"**.
- **Tiện ích một chạm:** Đặt lịch khám mới, Xem hồ sơ bệnh án, Thông báo hệ thống.

### 2.3. Đặt lịch & Quản lý Lịch khám (`Lịch khám`)
- **Đặt lịch chuyên khoa:** Chọn Chuyên khoa (Nội tổng quát, Tim mạch, Nội tiết, Nhi khoa, Da liễu, Tai Mũi Họng...), chọn Bác sĩ, Ngày khám và Giờ khám.
- **Áp dụng BHYT:** Hệ thống tự động nhận diện mức hưởng BHYT và giảm trừ tiền trực tiếp trên chi phí khám.
- **Danh sách lịch hẹn:** Hiển thị rõ ràng theo khối ngày tháng trực quan:
  - Trạng thái ca khám: `Chờ thanh toán`, `Chờ khám`, `Đang khám`, `Đã hoàn tất`, `Đã hủy`.
  - Nút **"Vào khám"**: Kích hoạt buồng khám trực tuyến khi đến giờ hẹn.
  - Nút **"PDF"**: Xem và tải về Phiếu khám & Đơn thuốc ký số SmartCA sau khi khám xong.
  - Nút **"Trả phí"**: Mở mã VietQR thanh toán nhanh nếu chưa đóng tiền.

### 2.4. Trung tâm Kết nối Thiết bị Y tế Thông minh (`Thiết bị`)
- **Hiển thị thiết bị đã ghép đôi:**
  - Danh sách trực quan các máy đo sinh hiệu cá nhân đã kết nối vào tài khoản y bạ.
  - Thẻ thiết bị tinh gọn chuẩn y tế: Tên máy, Hãng sản xuất, Tiêu chuẩn (FDA / CE Mark), Pin thiết bị, Thời điểm đo gần nhất.
  - Hiển thị chi tiết từng chỉ số đo kèm nhãn y khoa (SYS, DIA, PULSE, GLU, SpO2, PR, PI, TEMP, Weight, BMI...).
  - Nút **"Đồng bộ"**: Lấy số đo sinh hiệu tức thì đưa thẳng vào Hồ sơ EMR.
- **Thanh công cụ thao tác:**
  - **`+ Kết nối thiết bị mới`**: Mở popup ghép đôi thiết bị BLE tự động hoặc chọn từ danh mục thiết bị đạt chuẩn:
    - *Omron HEM-7361T Smart BP Monitor* (Huyết áp & Nhịp tim)
    - *Roche Accu-Chek Instant BLE* (Đường huyết mao mạch)
    - *Wellue FS20F Bluetooth Pulse Oximeter* (SpO2 & Nhịp mạch)
    - *Braun ThermoScan 7 Infrared Ear* (Nhiệt độ cơ thể)
    - *Tanita BC-401 Body Composition Scale* (Cân nặng, BMI, Tỷ lệ mỡ)
    - *CareConnect Camera PPG Bio-Sensor* (Cảm biến quang học)
  - **`Nhập số đo`**: Hộp thoại nhập chỉ số sinh hiệu thủ công khi không có thiết bị Bluetooth (Huyết áp, Đường huyết, Nhiệt độ, SpO2, Chiều cao, Cân nặng $\rightarrow$ tự động tính BMI và MAP).
  - **`Đo Camera PPG`**: Dùng camera điện thoại/máy tính và đèn flash để phân tích nhịp tim quang phổ mao mạch đầu ngón tay trong 15-30 giây.

### 2.5. Hồ sơ Sức khỏe Gia đình (`Gia đình`)
- **Quản lý y bạ người thân:** Thêm hồ sơ cho con nhỏ, bố mẹ già hoặc người phụ thuộc.
- **Thông tin lâm sàng riêng biệt:** Lưu trữ số thẻ BHYT, nhóm máu, tiền sử dị ứng thuốc và bệnh nền mãn tính cho từng người thân.
- **Đặt lịch tiện lợi:** Nút **"Đặt lịch khám ngay"** cho từng thành viên giúp tự động điền lý do và thông tin bệnh nhân khi đặt lịch hẹn bác sĩ.

### 2.6. Giám sát Sinh hiệu Chuyên sâu (`Sinh hiệu`)
- Bảng điều khiển telemetry hiển thị sóng tim ICU giả lập thời gian thực.
- Thống kê lịch sử diễn tiến chỉ số sinh hiệu (biểu đồ đường huyết, biến thiên huyết áp tâm thu/tâm trương, nồng độ oxy trong máu).
- Trạng thái kết nối Web Bluetooth API / Giả lập lâm sàng.

### 2.7. Hồ sơ Cá nhân & Bảo hiểm Y tế (`Hồ sơ`)
- **Thẻ CCCD & VNeID Mức 2:** Hiển thị số định danh, ngày cấp, trạng thái xác thực.
- **Thẻ BHYT Điện tử Chuẩn Quốc Gia:** Giao diện mô phỏng thẻ BHYT màu xanh chuẩn Bảo hiểm Xã hội Việt Nam, hiển thị mã thẻ, nơi ĐKKCB ban đầu, quyền lợi mức hưởng (ví dụ: 80% KCB đúng tuyến) và mã vạch tra cứu QĐ 4210.
- **Tabs chuyên biệt:**
  - *Hành chính & CCCD*: Cập nhật thông tin cá nhân, quét ảnh CCCD/BHYT bằng OCR.
  - *Y tế & Tiền sử*: Nhóm máu, dị ứng thuốc, bệnh lý mạn tính.
  - *Lịch sử khám bệnh*: Danh sách tất cả các đơn thuốc và phiếu khám đã ký số.
  - *Bảo mật Nghị định 13*: Quản lý sự đồng thuận chia sẻ dữ liệu y tế.

---

## 👨‍⚕️ 3. PHÂN HỆ DÀNH CHO BÁC SĨ (DOCTOR DASHBOARD)

### 3.1. Hàng đợi Khám bệnh & Điều phối Bệnh nhân
- **Danh sách bệnh nhân trong ngày:** Hiển thị theo thứ tự thời gian và mức độ ưu tiên sàng lọc từ bàn Điều dưỡng.
- **Trạng thái cuộc hẹn:** Đã thanh toán, Đang chờ bác sĩ, Đang hội chẩn, Đã hoàn tất.
- **Thao tác nhanh:** Mở bệnh án, Xem kết quả cận lâm sàng trước khi gọi, Gọi vào khám.

### 3.2. Buồng Khám Hội Chẩn Video HD (Telehealth Room)
- **Video & Audio HD 2 chiều:** Kết nối phòng khám riêng tư được mã hóa, không gián đoạn.
- **Xem sinh hiệu thời gian thực:** Bác sĩ vừa trao đổi qua video vừa theo dõi đồng thời các chỉ số đo huyết áp, SpO2, đường huyết mà bệnh nhân vừa đo ở nhà.
- **Chia sẻ hình ảnh & Bảng vẽ:** Giải thích kết quả chụp X-quang, MRI, giải phẫu cho bệnh nhân trực tiếp trên màn hình.

### 3.3. Hồ sơ Bệnh án Điện tử (EMR) & Kê đơn Ký số
- **Nhập bệnh án chuẩn SOAP:**
  - *S (Subjective):* Lý do khám, diễn biến triệu chứng bệnh nhân mô tả.
  - *O (Objective):* Khám lâm sàng từ xa, kết quả sinh hiệu đo được qua thiết bị.
  - *A (Assessment):* Chẩn đoán xác định kèm mã bệnh **ICD-10** (tra cứu tự động).
  - *P (Plan):* Hướng điều trị, dặn dò, hẹn ngày tái khám.
- **Kê đơn thuốc điện tử thông minh:**
  - Tra cứu kho thuốc quốc gia theo hoạt chất/biệt dược, liều dùng, đường dùng, số lượng, cách uống.
  - Cảnh báo tương tác thuốc và dị ứng thuốc dựa trên tiền sử bệnh án.
- **Ký số SmartCA:** Ký điện tử hợp chuẩn lên đơn thuốc và phiếu kết quả khám.
- **Gửi đơn thuốc tự động:** Đơn thuốc được đẩy lên Cổng Đơn thuốc Quốc gia và gửi tin nhắn thông báo mã đơn cho bệnh nhân mua thuốc tại bất kỳ nhà thuốc nào trên toàn quốc.

### 3.4. Cận lâm sàng & Chẩn đoán hình ảnh PACS / DICOM
- Xem kết quả xét nghiệm huyết học, sinh hóa, nước tiểu.
- Trình xem ảnh y khoa DICOM viewer (X-Quang, CT, MRI) hỗ trợ phóng to, điều chỉnh độ tương phản (Window/Level) và đo đạc kích thước tổn thương.

---

## 👩‍⚕️ 4. PHÂN HỆ DÀNH CHO ĐIỀU DƯỠNG (NURSE TRIAGE DESK)

### 4.1. Bàn Tiếp đón & Sàng lọc Phân luồng (Triage Desk)
- **Tiếp nhận bệnh nhân:** Rà soát bệnh nhân đăng ký khám trong ngày, kiểm tra tính hợp lệ của thẻ BHYT và tình trạng thanh toán viện phí.
- **Đo lường & Ghi nhận Sinh hiệu Sơ bộ:** Tiếp nhận số đo từ thiết bị IoT của bệnh nhân hoặc nhập trực tiếp chỉ số mạch, nhiệt độ, huyết áp, SpO2 ban đầu.
- **Chấm điểm phân loại nguy cơ (Triage Score):** Đánh giá mức độ khẩn cấp (Khẩn cấp / Bán cấp / Tiêu chuẩn) để ưu tiên thứ tự khám.
- **Điều phối buồng khám:** Chuyển ca khám vào đúng buồng làm việc của Bác sĩ chuyên khoa tương ứng kèm lời ghi chú tiếp đón.

### 4.2. Quản lý Lịch hẹn & Hỗ trợ Bệnh nhân
- Hỗ trợ đổi giờ khám, hủy lịch hoặc liên hệ nhắc bệnh nhân vào phòng chờ đúng giờ.
- Hướng dẫn bệnh nhân cài đặt ứng dụng, kết nối máy đo Bluetooth hoặc sử dụng tính năng đo Camera PPG.

---

## ⚙️ 5. PHÂN HỆ QUẢN TRỊ VIỆN (ADMIN DASHBOARD & DEVOPS)

### 5.1. Báo cáo Thống kê & Giám sát Viện
- Thống kê thời gian thực: Tổng lượt khám trong ngày/tháng, doanh thu viện phí, chi phí BHYT chi trả, thời gian khám trung bình của bác sĩ.
- Biểu đồ phân bổ bệnh nhân theo chuyên khoa và theo địa bàn.

### 5.2. Quản lý Danh mục Hệ thống
- **Nhân sự y tế:** Quản lý tài khoản Bác sĩ, Điều dưỡng, gán chuyên khoa, phân quyền buồng khám.
- **Chuyên khoa & Dịch vụ:** Cấu hình danh mục chuyên khoa khám từ xa, bảng giá khám thường, khám chuyên gia, mức đồng chi trả BHYT.
- **Kho dược:** Danh mục thuốc, hàm lượng, đơn vị tính liên thông Cổng Dược Quốc gia.

### 5.3. Giám định Viện phí & Trích xuất XML 4210
- Tổng hợp toàn bộ hồ sơ khám chữa bệnh BHYT trong kỳ.
- Trích xuất dữ liệu gói XML 4210 / XML 130 gồm các bảng chuẩn (Bảng 1: Thông tin bệnh nhân, Bảng 2: Thuốc, Bảng 3: Dịch vụ kỹ thuật...).
- Kiểm tra tính hợp lệ của file XML trước khi gửi lên Cổng Giám định BHYT của Bảo hiểm Xã hội Việt Nam.

### 5.4. Đối soát Viện phí VietQR
- Xem toàn bộ nhật ký giao dịch thanh toán chuyển khoản VietQR tự động.
- Trạng thái khớp lệnh giao dịch, xử lý các trường hợp cần hoàn tiền hoặc hủy lịch.

---

## 🔑 6. DANH SÁCH TÀI KHOẢN MẪU ĐỂ TRẢI NGHIỆM

Bạn có thể đăng nhập bằng các tài khoản sau trên cả giao diện Web và ứng dụng Di động (Mật khẩu mặc định: `ChangeMe123!`):

| Vai trò | Email đăng nhập | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Bệnh nhân** | `patient@example.test` | `ChangeMe123!` | Đặt lịch khám, kết nối thiết bị BLE, xem BHYT, đo PPG, khám từ xa |
| **Bác sĩ** | `doctor@example.test` | `ChangeMe123!` | Buồng khám Video HD, xem sinh hiệu EMR, kê đơn ký số SmartCA |
| **Điều dưỡng** | `nurse@example.test` | `ChangeMe123!` | Tiếp đón, sàng lọc Triage, đo sinh hiệu ban đầu, điều phối bác sĩ |
| **Quản trị viên** | `admin@example.test` | `ChangeMe123!` | Quản trị toàn viện, xuất XML 4210 BHYT, đối soát VietQR, hạ tầng |

---

## 🚀 7. ĐỊA CHỈ TRUY CẬP VÀ MÔI TRƯỜNG TRIỂN KHAI

- **Hệ thống Web Production:**  
  👉 [https://telemed.medicalcenter.vn](https://telemed.medicalcenter.vn)
- **Tài liệu API Backend Swagger UI:**  
  👉 `https://telemed.medicalcenter.vn/docs`
- **Ứng dụng Native Mobile (Android APK):**  
  Package ID: `vn.careconnect.telemedicine.patient`  
  Xem và điều khiển trực tiếp qua **[Android Device Hub](sidecar://android-cli-plugin/device-hub/)**.

---

## 🛠️ 8. HƯỚNG DẪN DÀNH CHO LẬP TRÌNH VIÊN (DEVELOPER GUIDE)

### Khởi chạy môi trường Local:
```bash
# 1. Chạy Backend & Hạ tầng
cd backend
python -m venv .venv
source .venv/bin/activate  # Hoặc .venv\Scripts\activate trên Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Chạy Frontend
cd frontend
npm install
npm run dev                # Khởi chạy Vite tại http://localhost:5173
```

### Build ứng dụng Mobile (Android Capacitor):
```bash
cd frontend
npm run build:mobile       # Build Vite và đồng bộ vào Android assets
cd android
.\gradlew.bat assembleDebug # Tạo file APK debug tại app/build/outputs/apk/debug/app-debug.apk
```
