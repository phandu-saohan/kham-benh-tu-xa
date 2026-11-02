import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from app.db import Base
# Import all models to ensure they are registered in metadata
import app.models

PG_URL = "postgresql+psycopg2://postgres:tobklteb61gqvbz0adpsyurqmkun1tir@72.61.123.73:5432/telemedicine"

def main():
    print("Connecting to Supabase Postgres (telemedicine db)...")
    engine = create_engine(PG_URL, pool_pre_ping=True)
    
    with engine.connect() as conn:
        res = conn.execute(text("SELECT current_database(), version();"))
        row = res.fetchone()
        print(f"Connected to DB: {row[0]}")
        print(f"Postgres Version: {row[1]}")

    print("Creating all tables in Supabase Postgres...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

    # Verify tables
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"))
        tables = [r[0] for r in res.fetchall()]
        print(f"Total tables created ({len(tables)}):")
        for t in tables:
            print(f"  - {t}")

if __name__ == "__main__":
    main()
