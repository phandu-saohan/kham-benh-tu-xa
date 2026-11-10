import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

try:
    import psycopg
    PG_DRIVER = "postgresql+psycopg"
except ImportError:
    PG_DRIVER = "postgresql+psycopg2"

os.environ["DATABASE_URL"] = f"{PG_DRIVER}://postgres:tobklteb61gqvbz0adpsyurqmkun1tir@72.61.123.73:5432/telemedicine"
os.environ["APP_ENV"] = "production"
os.environ["SEED_DEMO"] = "false"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text

def run():
    engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
    with engine.connect() as conn:
        print("=== USERS ===")
        for r in conn.execute(text("SELECT id, role, full_name, email, phone_number, blood_pressure, heart_rate, spo2, blood_glucose FROM users ORDER BY id")):
            print(" ", dict(r._mapping))
        print("=== APPOINTMENTS ===")
        for r in conn.execute(text("SELECT id, patient_id, doctor_id, reason, status, starts_at FROM appointments ORDER BY id")):
            print(" ", dict(r._mapping))
        print("=== RPM VITAL LOGS ===")
        for r in conn.execute(text("SELECT id, patient_id, device_name, device_type, systolic, diastolic, glucose_value, spo2_percent FROM rpm_vital_logs ORDER BY id")):
            print(" ", dict(r._mapping))
        print("=== FAMILY MEMBERS ===")
        for r in conn.execute(text("SELECT id, owner_user_id, full_name, relationship, bhyt_code FROM family_member_profiles ORDER BY id")):
            print(" ", dict(r._mapping))
    engine.dispose()

if __name__ == "__main__":
    run()
