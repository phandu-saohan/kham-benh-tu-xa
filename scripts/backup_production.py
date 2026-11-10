#!/usr/bin/env python3
"""
CareConnect Telemedicine - Automated Database Backup Script
Tuân thủ Luật Khám bệnh, chữa bệnh 2023 & Quy định lưu trữ Hồ sơ Bệnh án điện tử EMR tối thiểu 10 năm.

Chức năng:
1. Tự động sao lưu database (Hỗ trợ PostgreSQL qua pg_dump hoặc SQLite).
2. Nén định dạng gzip (.sql.gz) kèm timestamp.
3. Tự động xoay vòng xóa các bản sao lưu cũ quá RETENTION_DAYS (mặc định 30 ngày).
4. Có thể cấu hình chạy định kỳ qua Cronjob hoặc Dokploy Schedule.
"""

import os
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import subprocess
import datetime
import glob
import shutil

# Thư mục lưu trữ backup
BACKUP_DIR = os.environ.get("BACKUP_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backups"))
RETENTION_DAYS = int(os.environ.get("BACKUP_RETENTION_DAYS", "30"))
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./telemedicine.db")

def ensure_backup_dir():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        print(f"[INFO] Đã tạo thư mục sao lưu: {BACKUP_DIR}")

def backup_sqlite(db_path):
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    target_name = f"telemedicine_sqlite_{now_str}.db.gz"
    target_path = os.path.join(BACKUP_DIR, target_name)
    
    if not os.path.exists(db_path):
        print(f"[ERROR] Không tìm thấy file SQLite: {db_path}")
        return False
        
    import gzip
    with open(db_path, "rb") as f_in:
        with gzip.open(target_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
            
    size_mb = os.path.getsize(target_path) / (1024 * 1024)
    print(f"[SUCCESS] Đã sao lưu SQLite thành công: {target_name} ({size_mb:.2f} MB)")
    return True

def backup_postgres(db_url):
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    target_name = f"telemedicine_pg_{now_str}.sql.gz"
    target_path = os.path.join(BACKUP_DIR, target_name)
    
    # Parse postgres URL: postgresql+psycopg://user:pass@host:port/dbname
    clean_url = db_url.replace("+psycopg", "")
    
    print(f"[INFO] Bắt đầu sao lưu PostgreSQL...")
    cmd = f'pg_dump "{clean_url}" | gzip > "{target_path}"'
    
    try:
        res = subprocess.run(cmd, shell=True, check=True)
        size_mb = os.path.getsize(target_path) / (1024 * 1024)
        print(f"[SUCCESS] Đã sao lưu PostgreSQL thành công: {target_name} ({size_mb:.2f} MB)")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] pg_dump thất bại: {e}")
        return False

def clean_old_backups():
    cutoff = datetime.datetime.now() - datetime.timedelta(days=RETENTION_DAYS)
    files = glob.glob(os.path.join(BACKUP_DIR, "*.gz"))
    deleted_count = 0
    for f in files:
        mtime = datetime.datetime.fromtimestamp(os.path.getmtime(f))
        if mtime < cutoff:
            try:
                os.remove(f)
                deleted_count += 1
                print(f"[CLEANUP] Đã xóa bản sao lưu cũ: {os.path.basename(f)}")
            except Exception as e:
                print(f"[WARN] Không xóa được file cũ {f}: {e}")
    if deleted_count > 0:
        print(f"[INFO] Đã dọn dẹp {deleted_count} bản sao lưu cũ hơn {RETENTION_DAYS} ngày.")

def main():
    print("=" * 60)
    print(" CareConnect Telemedicine - Sao lưu Cơ sở dữ liệu Định kỳ")
    print("=" * 60)
    ensure_backup_dir()
    
    success = False
    if "postgres" in DATABASE_URL.lower():
        success = backup_postgres(DATABASE_URL)
    else:
        # SQLite
        path = DATABASE_URL.replace("sqlite:///", "")
        if path.startswith("./"):
            path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", path[2:])
        success = backup_sqlite(path)
        
    if success:
        clean_old_backups()
        print("[DONE] Hoàn tất tiến trình sao lưu an toàn.")
    else:
        print("[FAIL] Tiến trình sao lưu không thành công.")
        sys.exit(1)

if __name__ == "__main__":
    main()
