/**
 * Chuẩn hóa ngày tháng năm & thời điểm theo quy định của Bộ Y tế
 * Căn cứ Quyết định số 130/QĐ-BYT về chuẩn định dạng dữ liệu đầu ra phục vụ quản lý KCB & Bệnh án điện tử.
 *
 * 1. Định dạng ngày tháng năm thông thường (hiển thị giao diện, hồ sơ, phiếu khám):
 *    dd/MM/yyyy (ví dụ: 31/03/2023)
 *
 * 2. Định dạng thời điểm chi tiết trong trao đổi & lưu trữ dữ liệu điện tử (XML 4210 / QĐ 130 / HIS / EMR):
 *    yyyymmddHHMM (12 ký tự liền nhau, ví dụ: 202303311520 cho ngày 31/03/2023 lúc 15:20)
 *
 * 3. Định dạng ngày sinh / ngày cấp / hạn thẻ:
 *    yyyyMMdd (8 ký tự liền nhau, ví dụ: 19850331 cho ngày 31/03/1985)
 */

export function padZero(num: number, size = 2): string {
  let s = num.toString();
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Phân tích chuỗi đầu vào đa định dạng thành đối tượng Date.
 * Hỗ trợ ISO string, yyyy-MM-dd, yyyymmddHHMM (12 ký tự), yyyyMMdd (8 ký tự), dd/MM/yyyy.
 */
export function parseFlexibleDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  const s = String(val).trim();
  if (!s) return null;

  // Trường hợp chuỗi 12 ký tự số QĐ 130: yyyymmddHHMM
  if (/^\d{12}$/.test(s)) {
    const year = parseInt(s.substring(0, 4), 10);
    const month = parseInt(s.substring(4, 6), 10) - 1;
    const day = parseInt(s.substring(6, 8), 10);
    const hour = parseInt(s.substring(8, 10), 10);
    const minute = parseInt(s.substring(10, 12), 10);
    const d = new Date(year, month, day, hour, minute);
    return isNaN(d.getTime()) ? null : d;
  }

  // Trường hợp chuỗi 8 ký tự số: yyyyMMdd
  if (/^\d{8}$/.test(s)) {
    const year = parseInt(s.substring(0, 4), 10);
    const month = parseInt(s.substring(4, 6), 10) - 1;
    const day = parseInt(s.substring(6, 8), 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Trường hợp chuỗi dd/MM/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [dStr, mStr, yStr] = s.split('/');
    const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // Chuỗi ISO hoặc date string chuẩn
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Định dạng ngày tháng năm thông thường theo chuẩn Bộ Y tế: dd/MM/yyyy
 * Ví dụ: 31/03/2023
 */
export function formatDateVN(val: string | Date | null | undefined, fallback = ''): string {
  const d = parseFlexibleDate(val);
  if (!d) return fallback;
  const day = padZero(d.getDate());
  const month = padZero(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng thời điểm chi tiết hiển thị cho người dùng: dd/MM/yyyy HH:mm
 * Ví dụ: 31/03/2023 15:20
 */
export function formatDateTimeVN(val: string | Date | null | undefined, fallback = ''): string {
  const d = parseFlexibleDate(val);
  if (!d) return fallback;
  const day = padZero(d.getDate());
  const month = padZero(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Định dạng thời điểm chi tiết trao đổi & lưu trữ chuẩn QĐ 130/QĐ-BYT: yyyymmddHHMM (12 ký tự liền nhau)
 * Ví dụ: 202303311520 cho 31/03/2023 lúc 15:20
 */
export function toQd130Timestamp(val?: string | Date | null): string {
  const d = val ? parseFlexibleDate(val) || new Date() : new Date();
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  return `${year}${month}${day}${hours}${minutes}`;
}

/**
 * Định dạng ngày sinh / ngày thẻ chuẩn QĐ 130/QĐ-BYT: yyyyMMdd (8 ký tự liền nhau)
 * Ví dụ: 19850331 cho 31/03/1985
 */
export function toQd130Date(val?: string | Date | null): string {
  const d = val ? parseFlexibleDate(val) || new Date() : new Date();
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${year}${month}${day}`;
}

/**
 * Chuyển chuỗi 12 ký tự yyyymmddHHMM hoặc 8 ký tự yyyyMMdd sang định dạng hiển thị dd/MM/yyyy [HH:mm]
 */
export function formatQd130ForDisplay(val: string | null | undefined, fallback = ''): string {
  if (!val) return fallback;
  const s = String(val).trim();
  if (/^\d{12}$/.test(s)) {
    return `${s.substring(6, 8)}/${s.substring(4, 6)}/${s.substring(0, 4)} ${s.substring(8, 10)}:${s.substring(10, 12)}`;
  }
  if (/^\d{8}$/.test(s)) {
    return `${s.substring(6, 8)}/${s.substring(4, 6)}/${s.substring(0, 4)}`;
  }
  return formatDateVN(s, fallback);
}
