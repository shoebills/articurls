from fastapi import FastAPI, Depends, APIRouter
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from typing import List

router = APIRouter(
    tags=["User"],
    prefix="/user"
)

@router.post("/user", response_model=schemas.GetUser)
def create_user(request: schemas.CreateUser, db: Session = Depends(get_db)):

    new_user = models.User(name=request.name, email=request.email, password=request.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
 
    return new_user

@router.get("/user/{id}", response_model=schemas.GetUser)
def get_user(id: int, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_id == id).first()

    return user