import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

# Point DATABASE_URL to Supabase Postgres telemedicine db
os.environ["DATABASE_URL"] = "postgresql+psycopg://postgres:tobklteb61gqvbz0adpsyurqmkun1tir@72.61.123.73:5432/telemedicine"
os.environ["APP_ENV"] = "development"
os.environ["SEED_DEMO"] = "true"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db import SessionLocal
from app.main import seed_demo
from app.models import User, Department, DoctorShift

def run():
    print("Running seed_demo against Supabase Postgres...")
    seed_demo()
    db = SessionLocal()
    print(f"Users in DB: {db.query(User).count()}")
    for u in db.query(User).all():
        print(f"  [{u.role}] ID={u.id} {u.full_name} ({u.email} / {u.phone_number})")
    print(f"Departments in DB: {db.query(Department).count()}")
    for d in db.query(Department).all():
        print(f"  [{d.code}] {d.name}")
    print(f"Doctor Shifts in DB: {db.query(DoctorShift).count()}")
    db.close()
    print("Seed completed successfully!")

if __name__ == "__main__":
    run()
