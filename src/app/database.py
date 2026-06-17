from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

def _resolve_sslmode() -> str | None:
    if settings.database_sslmode:
        return settings.database_sslmode

    host = settings.database_hostname.lower()
    # Managed providers generally require TLS.
    if host.endswith(".ondigitalocean.com") or "neon.tech" in host or "supabase" in host:
        return "require"
    return None


_sslmode = _resolve_sslmode()
_query = f"?sslmode={_sslmode}" if _sslmode else ""

SQLALCHEMY_DATABASE_URL = (
    f"postgresql+psycopg://{quote_plus(settings.database_username)}:"
    f"{quote_plus(settings.database_password)}@"
    f"{settings.database_hostname}:{settings.database_port}/"
    f"{settings.database_name}{_query}"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
    pool_pre_ping=True,  # Detects stale/dropped connections before use
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()