import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def main():
    conn = psycopg2.connect(
        host="72.61.123.73",
        port=5432,
        user="postgres",
        password="tobklteb61gqvbz0adpsyurqmkun1tir",
        dbname="postgres"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='telemedicine'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE telemedicine;")
        print("Database 'telemedicine' created successfully!")
    else:
        print("Database 'telemedicine' already exists!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
