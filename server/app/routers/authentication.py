from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import authentication, user
from .. import models, hashing

router = APIRouter(
    tags=["Authentication"]
)

@router.post("/login", response_model=user.GetUser)
def login(request: authentication.Login, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.email == request.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid Credentials")
    
    if not hashing.verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Credentials")
    
    return user