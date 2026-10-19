"""Engine + session SQLAlchemy.

Default SQLite (zero setup, mudah debug). Ganti DATABASE_URL ke PostgreSQL
tanpa mengubah kode lain — model pakai tipe SQLAlchemy yang portable.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, future=True)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    """Dependency FastAPI: yield satu session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
