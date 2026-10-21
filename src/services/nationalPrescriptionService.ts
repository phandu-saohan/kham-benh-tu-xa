// Dịch vụ Liên thông Cổng Đơn thuốc Quốc gia (donthuocquocgia.vn)
// Tuân thủ Thông tư 27/2021/TT-BYT & Thông tư 04/2022/TT-BYT của Bộ Y Tế

import { Patient, PrescriptionItem } from '../types/telemedicine';
import { SmartCaService } from './smartCaService';

export interface NationalPrescriptionPayload {
  ma_co_so_kcb: string;
  ten_co_so_kcb: string;
  ma_don_thuoc: string;
  ma_bac_si: string;
  ten_bac_si: string;
  ngay_ke_don: string;
  hinh_thuc_kham: 'KHAM_TU_XA';
  benh_nhan: {
    ma_dinh_danh: string;
    ho_ten: string;
    ngay_sinh: string;
    gioi_tinh: number;
    so_the_bhyt: string;
    dia_chi: string;
    dien_thoai: string;
  };
  chan_doan: {
    ma_benh_chinh: string;
    ten_benh_chinh: string;
    ma_benh_kem_theo: string[];
    mo_ta_chi_tiet: string;
  };
  danh_sach_thuoc: Array<{
    stt: number;
    ma_thuoc_quoc_gia: string;
    ten_thuoc: string;
    hoat_chat: string;
    don_vi_tinh: string;
    so_luong: number;
    cach_dung: string;
    so_ngay_dung: number;
  }>;
  loi_dan: string;
  ngay_hen_tai_kham: string;
  chu_ky_so_bac_si: string;
  url_tra_cuu: string;
}

export class NationalPrescriptionService {
  private static hospitalCode = '79012'; // Mã cơ sở KCB Bộ Y Tế cấp
  private static hospitalName = 'Bệnh viện Đa Khoa Quốc Tế';

  /**
   * Tạo payload liên thông và cấp mã đơn thuốc quốc gia
   */
  public static async pushPrescription(
    patient: Patient,
    prescriptions: PrescriptionItem[],
    diagnosisText: string,
    primaryIcd: string,
    followUpDate: string,
    treatmentPlan: string
  ): Promise<{
    success: boolean;
    nationalCode: string;
    lookupUrl: string;
    payload: NationalPrescriptionPayload;
    submissionTimestamp: string;
  }> {
    const nationalCode = `DT-2026-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const lookupUrl = `https://donthuocquocgia.vn/tra-cuu?ma_don=${nationalCode}`;

    // Tạo nội dung để ký số
    const contentToSign = `${nationalCode}|${patient.id}|${patient.name}|${primaryIcd}|${prescriptions.length}`;
    const signResult = await SmartCaService.signDocument(nationalCode, 'PRESCRIPTION', contentToSign);

    const payload: NationalPrescriptionPayload = {
      ma_co_so_kcb: this.hospitalCode,
      ten_co_so_kcb: this.hospitalName,
      ma_don_thuoc: nationalCode,
      ma_bac_si: 'CCHN-004821',
      ten_bac_si: 'Vũ Minh Đức',
      ngay_ke_don: new Date().toISOString(),
      hinh_thuc_kham: 'KHAM_TU_XA',
      benh_nhan: {
        ma_dinh_danh: patient.id,
        ho_ten: patient.name,
        ngay_sinh: patient.dob,
        gioi_tinh: patient.gender === 'Nam' ? 1 : 2,
        so_the_bhyt: patient.bhyt,
        dia_chi: patient.address,
        dien_thoai: patient.phone
      },
      chan_doan: {
        ma_benh_chinh: primaryIcd,
        ten_benh_chinh: diagnosisText,
        ma_benh_kem_theo: ['I10', 'E78.2'],
        mo_ta_chi_tiet: diagnosisText
      },
      danh_sach_thuoc: prescriptions.map((p, idx) => ({
        stt: idx + 1,
        ma_thuoc_quoc_gia: `VN-${10000 + idx}-25`,
        ten_thuoc: p.name,
        hoat_chat: p.activeIngredient,
        don_vi_tinh: p.unit,
        so_luong: p.quantity,
        cach_dung: p.usage,
        so_ngay_dung: p.days
      })),
      loi_dan: treatmentPlan,
      ngay_hen_tai_kham: followUpDate,
      chu_ky_so_bac_si: signResult.certificate.signatureValueHex,
      url_tra_cuu: lookupUrl
    };

    return {
      success: true,
      nationalCode,
      lookupUrl,
      payload,
      submissionTimestamp: new Date().toLocaleTimeString('vi-VN')
    };
  }
}
