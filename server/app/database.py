from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base
from .config import settings

SQLALCHEMY_DATABASE_URL = (f"postgresql+psycopg://{settings.database_username}:"f"{settings.database_password}@"f"{settings.database_hostname}:"f"{settings.database_port}/"f"{settings.database_name}")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()