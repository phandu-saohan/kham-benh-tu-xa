"""
Lưu trữ Mock HIS bằng sqlite3 (stdlib) — không cần service DB ngoài.
Mục đích: test tích hợp, dữ liệu ghi vào file his.db để kiểm tra bằng admin API.
"""
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from seed_data import SEED_DEPARTMENTS, SEED_DOCTORS, SEED_PATIENTS, SEED_ENCOUNTERS

DB_PATH = Path(os.environ.get("HIS_DB_PATH", Path(__file__).parent / "his.db"))
_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


class HisStore:
    def __init__(self):
        self.conn = _connect()
        self._init_schema()
        self._seed_if_empty()

    # --- schema -----------------------------------------------------------
    def _init_schema(self):
        with self.conn:
            self.conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS patients (
                    pid TEXT PRIMARY KEY,
                    full_name TEXT NOT NULL,
                    gender TEXT,
                    dob TEXT,
                    phone TEXT,
                    national_id TEXT,
                    bhyt_no TEXT,
                    address TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS conditions (
                    id TEXT PRIMARY KEY,
                    pid TEXT NOT NULL REFERENCES patients(pid),
                    icd10_code TEXT,
                    display TEXT,
                    note TEXT,
                    recorded_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS allergies (
                    id TEXT PRIMARY KEY,
                    pid TEXT NOT NULL REFERENCES patients(pid),
                    substance TEXT NOT NULL,
                    severity TEXT
                );
                CREATE TABLE IF NOT EXISTS encounters (
                    id TEXT PRIMARY KEY,
                    pid TEXT NOT NULL REFERENCES patients(pid),
                    doctor_id TEXT,
                    department_id TEXT,
                    started_at TEXT,
                    ended_at TEXT,
                    status TEXT NOT NULL DEFAULT 'in-progress',
                    reason TEXT,
                    source TEXT NOT NULL DEFAULT 'his',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    encounter_id TEXT NOT NULL REFERENCES encounters(id),
                    doc_type TEXT NOT NULL,
                    title TEXT,
                    content TEXT,
                    byte_size INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS medications (
                    id TEXT PRIMARY KEY,
                    pid TEXT NOT NULL REFERENCES patients(pid),
                    encounter_id TEXT,
                    national_rx_code TEXT,
                    instruction_text TEXT,
                    items_json TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    ts TEXT NOT NULL,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    status INTEGER NOT NULL,
                    summary TEXT
                );
                CREATE TABLE IF NOT EXISTS departments (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    code TEXT UNIQUE
                );
                CREATE TABLE IF NOT EXISTS doctors (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    department_id TEXT NOT NULL,
                    title TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_conditions_pid ON conditions(pid);
                CREATE INDEX IF NOT EXISTS idx_encounters_pid ON encounters(pid);
                CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
                """
            )

    def _seed_if_empty(self):
        row = self.conn.execute("SELECT COUNT(*) AS c FROM patients").fetchone()
        if row["c"] > 0:
            return
        now = _now()
        with self.conn:
            for d in SEED_DEPARTMENTS:
                self.conn.execute(
                    "INSERT OR IGNORE INTO departments (id, name, code) VALUES (?,?,?)",
                    (d["id"], d["name"], d["code"]),
                )
            for dc in SEED_DOCTORS:
                self.conn.execute(
                    "INSERT OR IGNORE INTO doctors (id, name, department_id, title) VALUES (?,?,?,?)",
                    (dc["id"], dc["name"], dc["department_id"], dc["title"]),
                )
            for p in SEED_PATIENTS:
                self.conn.execute(
                    "INSERT OR IGNORE INTO patients VALUES (?,?,?,?,?,?,?,?,?)",
                    (p["pid"], p["full_name"], p["gender"], p["dob"], p["phone"],
                     p["national_id"], p["bhyt_no"], p["address"], now),
                )
                for c in p["conditions"]:
                    self.conn.execute(
                        "INSERT INTO conditions VALUES (?,?,?,?,?,?)",
                        (uuid.uuid4().hex[:12], p["pid"], c["icd10_code"], c["display"], c.get("note", ""), now),
                    )
                for a in p["allergies"]:
                    self.conn.execute(
                        "INSERT INTO allergies VALUES (?,?,?,?)",
                        (uuid.uuid4().hex[:12], p["pid"], a["substance"], a["severity"]),
                    )
            for e in SEED_ENCOUNTERS:
                self.conn.execute(
                    "INSERT INTO encounters VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (uuid.uuid4().hex[:12], e["pid"], e["doctor_id"], e["department_id"],
                     e["started_at"], None, e["status"], e["reason"], "his", now),
                )

    # --- helpers ------------------------------------------------------------
    @staticmethod
    def _uuid() -> str:
        return uuid.uuid4().hex[:12]

    def log_event(self, method: str, path: str, status: int, summary: str = ""):
        with _lock, self.conn:
            self.conn.execute(
                "INSERT INTO events VALUES (?,?,?,?,?,?)",
                (self._uuid(), _now(), method, path, status, summary[:500]),
            )

    def find_patients(self, search: str = "", limit: int = 20):
        like = f"%{search.strip()}%"
        with _lock:
            rows = self.conn.execute(
                """SELECT * FROM patients
                   WHERE full_name LIKE ? OR pid LIKE ? OR phone LIKE ? OR national_id LIKE ?
                   ORDER BY pid LIMIT ?""",
                (like, like, like, like, max(1, min(limit, 100))),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_patient(self, pid: str):
        with _lock:
            row = self.conn.execute("SELECT * FROM patients WHERE pid = ?", (pid,)).fetchone()
        if not row:
            return None
        patient = dict(row)
        with _lock:
            patient["conditions"] = [dict(r) for r in self.conn.execute(
                "SELECT icd10_code, display, note, recorded_at FROM conditions WHERE pid = ?", (pid,))]
            patient["allergies"] = [dict(r) for r in self.conn.execute(
                "SELECT substance, severity FROM allergies WHERE pid = ?", (pid,))]
            patient["encounters"] = [dict(r) for r in self.conn.execute(
                "SELECT id, doctor_id, department_id, started_at, status, reason FROM encounters WHERE pid = ? ORDER BY started_at DESC LIMIT 20", (pid,))]
        return patient

    def upsert_patient(self, data: dict) -> str:
        pid = data.get("pid") or f"HIS-{datetime.now().year}-{self._uuid().upper()[:6]}"
        with _lock, self.conn:
            self.conn.execute(
                """INSERT INTO patients (pid, full_name, gender, dob, phone, national_id, bhyt_no, address, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(pid) DO UPDATE SET
                       full_name=excluded.full_name, gender=excluded.gender, dob=excluded.dob,
                       phone=excluded.phone, national_id=excluded.national_id, bhyt_no=excluded.bhyt_no,
                       address=excluded.address""",
                (pid, data.get("full_name", ""), data.get("gender"), data.get("dob"),
                 data.get("phone"), data.get("national_id"), data.get("bhyt_no"),
                 data.get("address"), _now()),
            )
        return pid

    def create_encounter(self, data: dict) -> dict:
        enc_id = f"ENC-{self._uuid().upper()}"
        pid = data.get("patient_id") or data.get("pid") or ""
        with _lock, self.conn:
            self.conn.execute(
                "INSERT INTO encounters VALUES (?,?,?,?,?,?,?,?,?,?)",
                (enc_id, pid, data.get("doctor_id"), data.get("department_id"),
                 data.get("started_at"), None, data.get("status", "in-progress"),
                 data.get("reason"), "telemedicine", _now()),
            )
        return {"encounter_id": enc_id, "patient_id": pid}

    def create_document(self, encounter_id: str, data: dict):
        content = data.get("content_base64") or data.get("content") or ""
        doc_id = f"DOC-{self._uuid().upper()}"
        with _lock, self.conn:
            self.conn.execute(
                "INSERT INTO documents VALUES (?,?,?,?,?,?,?)",
                (doc_id, encounter_id, data.get("doc_type", "unknown"),
                 data.get("title", ""), content, len(content), _now()),
            )
        return {"document_id": doc_id}

    def create_prescription(self, data: dict):
        rx_id = f"RX-{self._uuid().upper()}"
        pid = data.get("patient_id") or data.get("pid") or ""
        with _lock, self.conn:
            self.conn.execute(
                "INSERT INTO medications VALUES (?,?,?,?,?,?)",
                (rx_id, pid, data.get("encounter_id"), data.get("national_rx_code"),
                 data.get("instruction_text"), data.get("items_json"), _now()),
            )
        return {"prescription_id": rx_id, "national_rx_code": data.get("national_rx_code")}

    def encounter_exists(self, encounter_id: str) -> bool:
        with _lock:
            row = self.conn.execute(
                "SELECT 1 FROM encounters WHERE id = ?", (encounter_id,)).fetchone()
        return row is not None

    def upsert_conditions_note(self, pid: str, icd10_code: str | None, display: str | None):
        with _lock, self.conn:
            self.conn.execute(
                "INSERT INTO conditions VALUES (?,?,?,?,?,?)",
                (self._uuid(), pid, icd10_code or "", display or "", "Từ telemedicine (synthetic)", _now()),
            )

    def list_departments(self):
        with _lock:
            rows = self.conn.execute("SELECT * FROM departments").fetchall()
        return [dict(r) for r in rows]

    def list_doctors(self, department_id: str = ""):
        with _lock:
            if department_id:
                rows = self.conn.execute(
                    "SELECT * FROM doctors WHERE department_id = ?", (department_id,)).fetchall()
            else:
                rows = self.conn.execute("SELECT * FROM doctors").fetchall()
        return [dict(r) for r in rows]

    def stats(self):
        with _lock:
            def count(table):
                return self.conn.execute(f"SELECT COUNT(*) AS c FROM {table}").fetchone()["c"]
            return {t: count(t) for t in
                    ("patients", "conditions", "encounters", "documents", "medications", "events")}

    def recent_events(self, limit: int = 50):
        with _lock:
            rows = self.conn.execute(
                "SELECT ts, method, path, status, summary FROM events ORDER BY ts DESC LIMIT ?",
                (max(1, min(limit, 200)),)).fetchall()
        return [dict(r) for r in rows]
