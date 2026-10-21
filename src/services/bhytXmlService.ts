// Dịch vụ Xuất & Thẩm định Hồ sơ Giám định BHYT Chuẩn XML 4210 / 130
// Cổng Tiếp nhận Dữ liệu Giám định BHYT của Bảo hiểm Xã hội Việt Nam

import { Patient, PrescriptionItem, CpoeOrderItem } from '../types/telemedicine';

export class BhytXmlService {
  /**
   * Tạo chuỗi XML 4210 Bảng Tổng Hợp Chi Phí Khám Chữa Bệnh Từ Xa
   */
  public static generateXml4210(
    patient: Patient,
    prescriptions: PrescriptionItem[],
    cpoeOrders: CpoeOrderItem[],
    diagnosisCode: string
  ): string {
    const selectedCpoe = cpoeOrders.filter(o => o.selected);
    const cpoeTotal = selectedCpoe.reduce((sum, i) => sum + i.price, 0);
    const consultFee = 250000;
    const drugTotal = prescriptions.reduce((sum, p) => sum + p.quantity * 25000, 0);
    const totalCost = cpoeTotal + consultFee + drugTotal;
    const bhytPay = Math.round(totalCost * 0.8);
    const patientPay = totalCost - bhytPay;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<CHITIEU_DULIEU_KCB_BHYT xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- BẢNG 1: TỔNG HỢP CHI PHÍ KHÁM CHỮA BỆNH NGOẠI TRÚ TỪ XA -->
  <BANG_TONG_HOP>
    <MA_LK>LK-2026-${patient.id.split('-').pop()}</MA_LK>
    <STT>1</STT>
    <MA_BN>${patient.id}</MA_BN>
    <HO_TEN>${patient.name}</HO_TEN>
    <NGAY_SINH>${patient.dob.split('/').reverse().join('')}</NGAY_SINH>
    <GIOI_TINH>${patient.gender === 'Nam' ? '1' : '2'}</GIOI_TINH>
    <DIA_CHI>${patient.address}</DIA_CHI>
    <MA_THE>${patient.bhyt}</MA_THE>
    <MA_DKBD>79012</MA_DKBD>
    <MA_BENH>${diagnosisCode}</MA_BENH>
    <MA_BENHKEM>I10;E78.2</MA_BENHKEM>
    <MA_LOAI_KCB>1</MA_LOAI_KCB> <!-- 1: Khám ngoại trú từ xa -->
    <NGAY_VAO>202610160915</NGAY_VAO>
    <NGAY_RA>202610160945</NGAY_RA>
    <SO_NGAY_DTRI>0</SO_NGAY_DTRI>
    <KET_QUA_DTRI>1</KET_QUA_DTRI> <!-- 1: Đỡ/Giảm -->
    <T_TONGCHI>${totalCost}</T_TONGCHI>
    <T_XETNGHIEM>${cpoeTotal}</T_XETNGHIEM>
    <T_THUOC>${drugTotal}</T_THUOC>
    <T_KHAM>${consultFee}</T_KHAM>
    <T_BHYT>${bhytPay}</T_BHYT>
    <T_BNTT>${patientPay}</T_BNTT>
  </BANG_TONG_HOP>

  <!-- BẢNG 2: CHI TIẾT THUỐC BHYT THANH TOÁN -->
  <BANG_CHI_TIET_THUOC>
${prescriptions.map((p, idx) => `    <THUOC>
      <STT>${idx + 1}</STT>
      <MA_THUOC>VN-1002${idx}-25</MA_THUOC>
      <TEN_THUOC>${p.name}</TEN_THUOC>
      <DON_VI_TINH>${p.unit}</DON_VI_TINH>
      <SO_LUONG>${p.quantity}</SO_LUONG>
      <DON_GIA>25000</DON_GIA>
      <THANH_TIEN>${p.quantity * 25000}</THANH_TIEN>
      <LIEU_DUNG>${p.usage}</LIEU_DUNG>
    </THUOC>`).join('\n')}
  </BANG_CHI_TIET_THUOC>

  <!-- BẢNG 3: CHI TIẾT DỊCH VỤ KỸ THUẬT & CẬN LÂM SÀNG -->
  <BANG_CHI_TIET_DVKT>
${selectedCpoe.map((c, idx) => `    <DICH_VU>
      <STT>${idx + 1}</STT>
      <MA_DICH_VU>${c.code}</MA_DICH_VU>
      <TEN_DICH_VU>${c.name}</TEN_DICH_VU>
      <DON_GIA>${c.price}</DON_GIA>
      <THANH_TIEN>${c.price}</THANH_TIEN>
    </DICH_VU>`).join('\n')}
  </BANG_CHI_TIET_DVKT>
</CHITIEU_DULIEU_KCB_BHYT>`;

    return xml;
  }
}
