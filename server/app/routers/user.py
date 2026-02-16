from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..security import hashing
from ..schemas import user

router = APIRouter(
    tags=["User"],
    prefix="/user"
)

@router.post("/", response_model=user.GetUser, status_code=status.HTTP_201_CREATED)
def create_user(request: user.CreateUser, db: Session = Depends(get_db)):

    existing_user = db.query(models.User).filter(models.User.email == request.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered")
    
    hashed_password = hashing.get_password_hash(request.password)
    
    new_user = models.User(name=request.name, email=request.email, password=hashed_password)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.get("/{id}", response_model=user.GetUser, status_code=200)
def get_user(id: int, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_id == id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"User with id: {id} doesnt exist")
    
    return user