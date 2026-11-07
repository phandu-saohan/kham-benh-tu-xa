"""
Chuẩn hóa dữ liệu ngày tháng và thời điểm theo quy định của Bộ Y tế
(Quyết định số 130/QĐ-BYT về chuẩn và định dạng dữ liệu đầu ra phục vụ quản lý, giám định, thanh toán chi phí KCB và giải quyết các chế độ liên quan).
- Định dạng ngày tháng năm thông thường: dd/MM/yyyy (ví dụ: 31/03/2023)
- Định dạng thời điểm chi tiết trao đổi & lưu trữ: yyyymmddHHMM (12 ký tự số, ví dụ: 202303311520)
- Định dạng ngày sinh / ngày thẻ: yyyyMMdd (8 ký tự số, ví dụ: 19850331)
"""

from datetime import datetime
from typing import Optional, Union

def to_qd130_timestamp(dt: Optional[Union[datetime, str]] = None) -> str:
    """
    Chuyển đổi thời điểm sang chuẩn QĐ 130/QĐ-BYT: yyyymmddHHMM (12 ký tự liền nhau).
    Ví dụ: 31/03/2023 lúc 15:20 -> "202303311520"
    """
    if dt is None:
        dt = datetime.now()
    elif isinstance(dt, str):
        cleaned = dt.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(cleaned)
        except Exception:
            return datetime.now().strftime("%Y%m%d%H%M")
    return dt.strftime("%Y%m%d%H%M")

def to_qd130_date(dt: Optional[Union[datetime, str]] = None) -> str:
    """
    Chuyển đổi ngày sang chuẩn QĐ 130/QĐ-BYT: yyyyMMdd (8 ký tự liền nhau).
    Ví dụ: "1985-05-10" hoặc "10/05/1985" -> "19850510"
    """
    if dt is None:
        return datetime.now().strftime("%Y%m%d")
    if isinstance(dt, str):
        trimmed = dt.strip()
        if len(trimmed) == 8 and trimmed.isdigit():
            return trimmed
        if "/" in trimmed:
            parts = trimmed.split("/")
            if len(parts) == 3:
                d, m, y = parts
                return f"{y.zfill(4)}{m.zfill(2)}{d.zfill(2)}"
        if "-" in trimmed:
            parts = trimmed.split("T")[0].split("-")
            if len(parts) == 3:
                y, m, d = parts
                return f"{y.zfill(4)}{m.zfill(2)}{d.zfill(2)}"
        try:
            dt_obj = datetime.fromisoformat(trimmed.replace("Z", "+00:00"))
            return dt_obj.strftime("%Y%m%d")
        except Exception:
            return trimmed[:8].replace("-", "").replace("/", "")
    return dt.strftime("%Y%m%d")

def format_date_vn(dt: Optional[Union[datetime, str]] = None) -> str:
    """
    Định dạng ngày tháng năm thông thường chuẩn hiển thị Bộ Y tế: dd/MM/yyyy.
    Ví dụ: "2023-03-31" -> "31/03/2023"
    """
    if not dt:
        return "Chưa cập nhật"
    if isinstance(dt, str):
        trimmed = dt.strip()
        if len(trimmed) == 10 and trimmed[2] == "/" and trimmed[5] == "/":
            return trimmed
        if len(trimmed) == 8 and trimmed.isdigit():
            return f"{trimmed[6:8]}/{trimmed[4:6]}/{trimmed[0:4]}"
        if len(trimmed) >= 12 and trimmed[:12].isdigit():
            return f"{trimmed[6:8]}/{trimmed[4:6]}/{trimmed[0:4]}"
        if "-" in trimmed:
            parts = trimmed.split("T")[0].split("-")
            if len(parts) == 3:
                y, m, d = parts
                return f"{d.zfill(2)}/{m.zfill(2)}/{y.zfill(4)}"
        try:
            dt_obj = datetime.fromisoformat(trimmed.replace("Z", "+00:00"))
            return dt_obj.strftime("%d/%m/%Y")
        except Exception:
            return str(trimmed)
    return dt.strftime("%d/%m/%Y")

def format_datetime_vn(dt: Optional[Union[datetime, str]] = None) -> str:
    """
    Định dạng ngày giờ hiển thị chuẩn Việt Nam: dd/MM/yyyy HH:mm.
    Ví dụ: "202303311520" -> "31/03/2023 15:20"
    """
    if not dt:
        return "Chưa cập nhật"
    if isinstance(dt, str):
        trimmed = dt.strip()
        if len(trimmed) == 12 and trimmed.isdigit():
            return f"{trimmed[6:8]}/{trimmed[4:6]}/{trimmed[0:4]} {trimmed[8:10]}:{trimmed[10:12]}"
        try:
            dt_obj = datetime.fromisoformat(trimmed.replace("Z", "+00:00"))
            return dt_obj.strftime("%d/%m/%Y %H:%M")
        except Exception:
            return str(trimmed)
    return dt.strftime("%d/%m/%Y %H:%M")

def parse_qd130_timestamp(qd130_str: str) -> Optional[datetime]:
    """
    Chuyển chuỗi 12 ký tự yyyymmddHHMM thành đối tượng datetime.
    """
    if not qd130_str or len(qd130_str) < 12:
        return None
    try:
        return datetime.strptime(qd130_str[:12], "%Y%m%d%H%M")
    except Exception:
        return None
