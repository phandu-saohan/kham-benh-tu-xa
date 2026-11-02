import sqlite3
import psycopg2
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

SQLITE_PATH = "backend/telemedicine.db"
PG_PARAMS = {
    "host": "72.61.123.73",
    "port": 5432,
    "user": "postgres",
    "password": "tobklteb61gqvbz0adpsyurqmkun1tir",
    "dbname": "telemedicine"
}

def migrate():
    if not os.path.exists(SQLITE_PATH):
        print(f"SQLite file {SQLITE_PATH} does not exist.")
        return

    s_conn = sqlite3.connect(SQLITE_PATH)
    s_cur = s_conn.cursor()
    s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [r[0] for r in s_cur.fetchall()]
    print(f"Found {len(tables)} tables in SQLite: {tables}")

    p_conn = psycopg2.connect(**PG_PARAMS)
    p_cur = p_conn.cursor()

    # Disable foreign key checks temporarily during migration
    p_cur.execute("SET session_replication_role = 'replica';")

    for table in tables:
        # Check target columns and data types in Postgres
        p_cur.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = %s AND table_schema = 'public';
        """, (table,))
        pg_types = {r[0]: r[1] for r in p_cur.fetchall()}
        if not pg_types:
            print(f"Table {table} not found in Postgres, skipping.")
            continue

        s_cur.execute(f"PRAGMA table_info({table})")
        cols = [r[1] for r in s_cur.fetchall() if r[1] in pg_types]
        if not cols:
            continue

        s_cur.execute(f"SELECT {', '.join(cols)} FROM {table}")
        rows = s_cur.fetchall()
        if not rows:
            print(f"Table {table}: 0 rows, skipping.")
            continue

        # Convert boolean columns from int (0/1) to bool (False/True)
        converted_rows = []
        for row in rows:
            new_row = []
            for col, val in zip(cols, row):
                if pg_types[col] == "boolean" and val is not None:
                    new_row.append(bool(val))
                else:
                    new_row.append(val)
            converted_rows.append(tuple(new_row))

        # Clean existing rows in PG table
        p_cur.execute(f"TRUNCATE TABLE {table} CASCADE;")

        col_str = ", ".join(cols)
        placeholder = ", ".join(["%s"] * len(cols))
        query = f"INSERT INTO {table} ({col_str}) VALUES ({placeholder})"

        p_cur.executemany(query, converted_rows)
        p_conn.commit()
        print(f"Migrated {len(converted_rows)} rows into {table}")

        # Update sequence for tables with an 'id' column
        if "id" in cols:
            try:
                p_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table};")
                p_conn.commit()
            except Exception:
                p_conn.rollback()

    p_cur.execute("SET session_replication_role = 'origin';")
    p_conn.commit()

    print("\nVerification on Supabase Postgres:")
    for table in tables:
        p_cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = p_cur.fetchone()[0]
        print(f"  {table}: {count} rows")

    p_cur.close()
    p_conn.close()
    s_cur.close()
    s_conn.close()
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    migrate()
