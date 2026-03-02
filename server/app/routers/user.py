from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..security import hashing, oauth2
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
    
    new_user = models.User(name=request.name, 
                           user_name=request.user_name, 
                           email=request.email, 
                           password=hashed_password, 
                           seo_title=request.seo_title,
                           seo_description=request.seo_description)

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

@router.patch("/{id}", response_model=user.GetUser, status_code=status.HTTP_202_ACCEPTED)
def update_user(id: int, request: user.UpdateUser, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user)):
    
    user = db.query(models.User).filter(models.User.user_id == id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with id: {id} not found")
    
    if user.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    update_data = request.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return user