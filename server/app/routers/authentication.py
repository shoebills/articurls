from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import authentication, user
from .. import models

router = APIRouter(
    tags=["Authentication"]
)

@router.post("/login", response_model=user.GetUser)
def login(request: authentication.Login, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.username, models.User.password == request.password).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid Credentials")
    
    return user