# BẢNG CHECKLIST NGHIỆM THU GO-LIVE HỆ THỐNG TELEMEDICINE
## CARECONNECT TELEMEDICINE & BỆNH ÁN ĐIỆN TỬ EMR
*Dành cho Ban Giám đốc, Trưởng khoa Khám bệnh và Trưởng phòng CNTT*

---

| STT | Hạng mục kiểm tra | Tiêu chuẩn đạt yêu cầu | Trạng thái kỹ thuật | Người duyệt |
| :---: | :--- | :--- | :---: | :---: |
| **I** | **PHÁP LÝ & CẤP PHÉP Y TẾ** | | | |
| 1 | Hồ sơ KCB từ xa | Đã nộp công bố đủ điều kiện KCB từ xa (Điều 64 Luật KCB 2023) | [ ] Chờ nộp | Ban Giám đốc |
| 2 | Chứng chỉ hành nghề (CCHN) | 100% Bác sĩ tham gia có CCHN còn hạn và đăng ký danh sách hành nghề | [x] Đã có trường DB | Phòng KHTH |
| 3 | Cam kết Nghị định 13/2023/NĐ-CP | Quy chế bảo vệ dữ liệu sức khỏe người bệnh & tính năng Patient Consent | [x] Sẵn sàng trên App | Pháp chế |
| **II** | **KẾT NỐI HỆ THỐNG NGOÀI (INTEGRATIONS)** | | | |
| 4 | Cổng Đơn thuốc Quốc gia | Được cấp Mã cơ sở KCB và API Key thật tại `donthuocquocgia.vn` | [ ] Chờ cấp Key | Phòng KHTH / Dược |
| 5 | Chữ ký số Bác sĩ (SmartCA) | Hợp đồng HSM / Cloud PKI (VNPT SmartCA / Viettel-CA) cấu hình vào Server | [ ] Cần điền .env | Phòng CNTT |
| 6 | Cổng Giám định BHYT XML 4210 | Tài khoản cơ sở KCB liên thông cổng BHXH Việt Nam | [ ] Cần điền .env | Phòng KHTH |
| 7 | Cổng thanh toán VietQR | Số tài khoản ngân hàng chính thức của Bệnh viện & Webhook gạch nợ tự động | [ ] Cần cấu hình STK | Phòng Tài chính |
| 8 | Cổng SMS / ZNS OTP | Brandname SMS bệnh viện gửi mã đăng nhập cho bệnh nhân | [ ] Cần đăng ký mẫu Brandname | Phòng CNTT |
| **III** | **HẠ TẦNG & AN TOÀN THÔNG TIN** | | | |
| 9 | Tên miền & SSL Production | Chạy HTTPS an toàn trên `https://telemed.medicalcenter.vn` | [x] Đạt chuẩn SSL | Phòng CNTT |
| 10 | Máy chủ Video TURN Server | Cấu hình Coturn / LiveKit TURN port 3478, 49152-65535 cho BN dùng 4G | [ ] Cần mở port Firewall | Phòng CNTT |
| 11 | Database & Sao lưu định kỳ | Script `backup_production.py` chạy tự động mỗi 02:00 sáng, giữ bản lưu 30 ngày | [x] Đã tạo & kiểm thử | Phòng CNTT |
| 12 | Đổi mật khẩu tài khoản mặc định | Đổi toàn bộ password của `admin@`, `doctor@`, `nurse@` | [ ] Cần thực hiện ngay | Phòng CNTT |
| **IV** | **DỮ LIỆU & VẬN HÀNH LÂM SÀNG** | | | |
| 13 | Khởi tạo Lịch trực tuần 1 | Đăng ký ca trực cho Bác sĩ, thiết lập định mức tối đa 12 ca/buổi chống quá tải | [x] Sẵn sàng trên Web | Điều dưỡng trưởng |
| 14 | Danh mục Thuốc & Viện phí | Kiểm tra giá khám tư vấn từ xa, danh mục thuốc tân dược thiết yếu | [x] Đã tích hợp danh mục BYT | Khoa Dược |
| 15 | Tập huấn Quy trình SOP | Đào tạo Bác sĩ và Điều dưỡng thực hành quy trình 4 bước theo tài liệu SOP | [x] Đã ban hành SOP | Trưởng khoa Khám |

---

### KÝ DUYỆT NGHIỆM THU

**ĐẠI DIỆN PHÒNG CNTT**  
*(Ký và ghi rõ họ tên)*

---

**ĐẠI DIỆN PHÒNG KẾ HOẠCH TỔNG HỢP**  
*(Ký và ghi rõ họ tên)*

---

**GIÁM ĐỐC BỆNH VIỆN / CƠ SỞ KCB**  
*(Ký, đóng dấu và ghi rõ họ tên)*
