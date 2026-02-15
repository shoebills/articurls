from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, DateTime, func, ForeignKey

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    
class Post(Base):
    __tablename__ = "posts"

    post_id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    user_id = Column(ForeignKey("users.user_id"), nullable=False)