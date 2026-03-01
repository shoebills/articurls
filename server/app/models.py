from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, Boolean, DateTime, func, ForeignKey

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    user_name = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class Blog(Base):
    __tablename__ = "blogs"

    blog_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())