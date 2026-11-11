from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

connect_args = {"check_same_thread": False} if settings.sqlalchemy_database_url.startswith("sqlite") else {}
engine_kwargs = {
    "pool_pre_ping": True,
    "connect_args": connect_args,
}
if not settings.sqlalchemy_database_url.startswith("sqlite"):
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_recycle": 1800,
        "pool_timeout": 30,
    })
engine = create_engine(settings.sqlalchemy_database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
