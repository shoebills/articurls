from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

SQLALCHEMY_DATABASE_URL = (f"postgresql+psycopg://{settings.database_username}:"f"{settings.database_password}@"f"{settings.database_hostname}:"f"{settings.database_port}/"f"{settings.database_name}")

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