# Hệ Thống Thiết Kế Chuẩn: Clinical Sanctuary (CareConnect Telemedicine & HIS)

> **Mốc chuẩn thiết kế giao diện (Design System Benchmark)** cho toàn bộ nền tảng Khám chữa bệnh từ xa & Bệnh án điện tử CareConnect (Web Portal, Doctor Workspace, Nurse Triage, Mobile App Native).
> Nguồn chuẩn: Stitch Mobile App UI Design - `Clinical Sanctuary`.

---

## 🏛️ 1. Triết Lý Thiết Kế Cốt Lõi (Core Philosophy)

**Modern Corporate Clinical** kết hợp **Tactile Soft Minimalism**:
- **Sự điềm tĩnh và tin cậy (Immediate Calmness & Institutional Trust):** Loại bỏ hoàn toàn sự lộn xộn (zero visual clutter) và sắc xám lạnh lẽo của bệnh viện truyền thống; thay vào đó là không gian ngập tràn ánh sáng với các bề mặt trong trẻo, mang lại cảm giác an tâm tuyệt đối cho người bệnh và người nhà trong các thời điểm căng thẳng y tế.
- **Độ chuẩn xác y khoa (Clinical Precision):** Mọi chỉ số sinh hiệu (Huyết áp, SpO2, Nhịp tim, Glucose), mã chẩn đoán ICD-10, liều dùng dược lâm sàng và mã định danh thẻ BHYT đều được trình bày với cấu trúc phân cấp thị giác mạch lạc, tương phản cao, chống nhầm lẫn.
- **Thân thiện mọi lứa tuổi:** Tối ưu hóa kích thước cảm ứng (Touch Target tối thiểu 48px × 48px), khoảng cách đọc thoáng và cỡ chữ dễ tiếp cận cho cả người cao tuổi theo dõi bệnh mạn tính lẫn bác sĩ trực ca dài.

---

## 🎨 2. Bảng Màu Chuẩn (Color System & Semantic Tokens)

### 2.1. Màu sắc chủ đạo (Brand & Medical Identity)
| Tên Token | Mã Hex | Vai trò & Ứng dụng |
| :--- | :--- | :--- |
| **Primary (Teal)** | `#005A71` | Màu thương hiệu đại diện thẩm quyền y khoa, ổn định. Dùng cho thanh điều hướng chính, nút hành động chính (Primary CTA), huy hiệu bác sĩ xác thực. |
| **Primary Container** | `#0E7490` | Nền các khối tiêu điểm, nút khám chính, tiêu đề phòng khám. |
| **On Primary** | `#FFFFFF` | Chữ / icon trên nền Primary. |
| **Secondary (Blue)** | `#006398` / `#0284C7` | Tông xanh kết nối số: Nút kích hoạt phòng khám Video Telehealth, lịch khám sắp tới, biểu đồ sinh tồn tương tác. |
| **Secondary Container** | `#5BB8FE` | Nền nhấn phụ, khối đếm cuộc gọi đến. |
| **Tertiary (Soft Mint)** | `#005F40` / `#007A53` / `#10B981` | Biểu trưng hồi phục, sức khỏe ổn định. Huy hiệu thẻ BHYT hợp lệ, đồng bộ dữ liệu HIS thành công, chỉ số sinh hiệu trong ngưỡng bình thường. |
| **Tertiary Container** | `#A3FFD0` (text: `#005236`) | Nền chip trạng thái "Đã xác thực", "Đang trực tuyến". |
| **Error / Critical (Crimson)** | `#BA1A1A` / `#EF4444` | Dành riêng cho cảnh báo Triage nguy kịch (Đỏ), tương tác thuốc chống chỉ định, nút cấp cứu SOS, ngắt cuộc gọi khẩn. |
| **Error Container** | `#FFDAD6` (text: `#93000A`) | Nền thông báo dị ứng thuốc nặng, cảnh báo sinh hiệu bất thường. |

### 2.2. Màu nền & Bề mặt (Surfaces & Canvas)
| Tên Token | Mã Hex | Vai trò thị giác |
| :--- | :--- | :--- |
| **Background / Surface** | `#F8F9FF` | Nền tổng thể nhẹ dịu, giảm mỏi mắt so với nền trắng gắt. |
| **Surface Container Lowest** | `#FFFFFF` | Nền thẻ (Card), phiếu bệnh án, buồng khám, bảng kết quả CLS. |
| **Surface Container Low** | `#EFF4FF` | Khối tìm kiếm, ô nhập liệu sơ bộ, phân vùng phụ. |
| **Surface Container** | `#E5EEFF` | Đường phân chia, nền thẻ thứ cấp, hover state. |
| **Surface Container High** | `#DCE9FF` | Phân cách trạng thái tích cực hoặc thanh trượt. |
| **On Surface (Main Text)** | `#0B1C30` | Màu chữ chính, độ tương phản sâu đạt chuẩn WCAG AAA. |
| **On Surface Variant (Muted Text)**| `#3F484C` / `#64748B` | Mô tả phụ, nhãn đơn vị đo lường, thời gian gửi kết quả. |
| **Outline / Border** | `#6F787D` / `#CBD5E1` | Viền hairline nhẹ cho input và card. |

---

## 🔤 3. Quy Chuẩn Kiểu Chữ (Typography System)

Chuẩn hóa font duy nhất: **Plus Jakarta Sans** (kèm fallback hệ thống y tế).

| Cấp bậc | Font Size | Line Height | Font Weight | Letter Spacing | Ngữ cảnh sử dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Headline XL** | 36px (Mobile: 28px) | 44px (36px) | 700 (Bold) | -0.02em | Tên phân hệ chính, tiêu đề đón tiếp ca khám lớn |
| **Headline LG** | 32px (Mobile: 24px) | 40px (32px) | 700 / 600 | -0.015em | Chỉ số thống kê chính (Tổng BN, thời gian khám) |
| **Headline MD** | 20px | 28px | 600 (SemiBold) | -0.01em | Tiêu đề khối buồng khám, tên bệnh nhân trong EMR |
| **Headline SM** | 18px | 26px | 600 (SemiBold) | 0 | Họ tên Bác sĩ, Tiêu đề phiếu xét nghiệm |
| **Body LG** | 16px | 24px | 400 / 500 | 0 | Hướng dẫn điều trị, lời dặn của bác sĩ |
| **Body MD** | 15px | 22px | 400 (Regular) | 0 | Nội dung bệnh sử, diễn biến triệu chứng lâm sàng |
| **Body SM** | 13px | 18px | 400 (Regular) | 0 | Liều dùng chi tiết từng viên thuốc, thông số đo |
| **Label LG** | 14px | 20px | 600 (SemiBold) | 0.01em | Nút bấm, danh mục chuyển khoa, tab điều hướng |
| **Label MD** | 12px | 16px | 600 (SemiBold) | 0.02em | Chip chuyên khoa, trạng thái hàng đợi |
| **Label SM** | 11px | 14px | 700 (Bold) | 0.04em (Uppercase) | Mã BHYT, Mã ICD-10, Nhãn phân loại Triage |

---

## 📐 4. Hệ Thống Hình Khối & Đổ Bóng (Shapes & Elevation)

### 4.1. Độ bo góc (Border Radius Hierarchy)
- **Base `rounded` (8px / `0.5rem`):** Ô nhập form, ô chọn ngày giờ, bảng kết quả cận lâm sàng.
- **Card Container `rounded-xl` (16px / `1rem`):** Thẻ bệnh nhân, thẻ lịch hẹn, khối hiển thị sinh hiệu BLE, buồng làm việc bác sĩ.
- **Modal / Sheet `rounded-2xl` (24px / `1.5rem`):** Hộp thoại ký số SmartCA, Bottom sheet tiếp đón, thanh công cụ Video Room.
- **Full Pill `rounded-full` (9999px):** Nút hành động chính (Teleconsult), chip phân loại, nút cấp cứu khẩn.

### 4.2. Độ sâu thị giác (Elevation & Ambient Lighting)
- **Level 1 (Thẻ bệnh án & Bảng đo):**  
  `background: #FFFFFF; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(14, 116, 144, 0.04);`
- **Level 2 (Buồng khám Video & Floating Panels):**  
  `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 10px 20px -3px rgba(14, 116, 144, 0.08);`
- **Level 3 (Modal ký số & Toa thuốc Drawer):**  
  `backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.95); box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12);`
- **Emergency Halo (Ca cấp cứu / Cảnh báo đỏ):**  
  `box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);` (Kèm hiệu ứng pulse).

---

## 🩺 5. Thành Phần Giao Diện Đặc Thù Y Tế (Specialized Clinical UI)

### 5.1. Thẻ BHYT Điện Tử Chuẩn Quốc Gia (Digital Health Card)
- Nền Gradient từ `#005A71` sang `#0284C7`, góc bo `rounded-2xl`.
- Mã BHYT định dạng Monospace rõ ràng kèm mã QR động tra cứu Cổng BHXH.
- Huy hiệu hợp lệ màu Mint: Nền `#ECFDF5`, viền `#A7F3D0`, chữ `#065F46` kèm icon xác thực.

### 5.2. Thanh Điều Khiển Buồng Khám Video (In-Call Floating Dock)
- Thiết kế Floating Pill bán trong suốt: `background: rgba(11, 28, 48, 0.88); backdrop-filter: blur(16px)`.
- Các nút tròn 48px: Micro, Camera, Chia sẻ kết quả CLS/PACS, Kê đơn nhanh.
- Nút Kết thúc ca khám màu đỏ thuần (`#EF4444`) có khoảng cách an toàn tránh bấm nhầm.

### 5.3. Bàn Tiếp Đón & Phân Luồng Triage (Nurse Triage Desk)
- Phân biệt 4 mức độ:
  - **Cấp cứu (Đỏ):** `#BA1A1A` + pulse effect.
  - **Ưu tiên (Vàng/Cam):** `#D97706` + nền `#FEF3C7`.
  - **Tiêu chuẩn (Xanh Teal):** `#0E7490`.
  - **Không khẩn cấp (Xanh lục):** `#059669`.

---

## 📌 6. Hướng Dẫn Áp Dụng Cho Lập Trình Viên & Designer
1. **Mọi module mới** (Bàn khám bác sĩ, Sổ sức khỏe gia đình, Smart Devices Hub, EMR) bắt buộc dùng các biến màu và font trong tài liệu này.
2. Tránh sử dụng màu xám tối lạnh hoặc màu xanh neon chói lóa.
3. Luôn đảm bảo chỉ số cận lâm sàng (Lab values) có nhãn đơn vị và khoảng tham chiếu bình thường đi kèm rõ ràng.
