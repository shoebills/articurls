import jwt
from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..security import hashing, oauth2
from ..schemas import user
from ..email.service import send_verify_new_user
from datetime import timedelta
from ..config import settings
from fastapi import UploadFile, File
from ..storage.service import save_image_local

router = APIRouter(
    tags=["User"],
    prefix="/user"
)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(request: user.CreateUser, db: Session = Depends(get_db)):

    db_email = db.query(models.User).filter(models.User.email == request.email).first()

    if db_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered")
    
    db_user_name = db.query(models.User).filter(models.User.user_name == request.user_name).first()
    
    if db_user_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered")
    
    hashed_password = hashing.get_password_hash(request.password)
    
    new_user = models.User(name=request.name, 
                           user_name=request.user_name, 
                           email=request.email, 
                           password=hashed_password, 
                           seo_title=f"{request.name}'s Blog",
                           seo_description=f"Explore all the blogs published by {request.name} on Articurls.",
                           profile_image_url=settings.default_profile_image_url)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    verify_token = oauth2.create_new_user_token(request.email)
    plan_choice = request.plan_choice
    send_verify_new_user(request.email, request.name, verify_token, plan_choice)

    return {"message": "Please check your mailbox to verify your email!"}

@router.get("/verify-new-user", status_code=status.HTTP_200_OK)
def verify_new_user(token: str, plan_choice: str, db: Session = Depends(get_db)):

    try:
        payload = oauth2.verify_new_user_token(token)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Request a new one."
        )

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation link",
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation link",
        )

    db_user = db.query(models.User).filter(models.User.email == payload.get("email")).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if plan_choice not in ("free", "pro"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan_choice; use 'free' or 'pro'"
            )
    
    next_step = "checkout" if plan_choice == "pro" else "dashboard"

    if db_user.is_verified:
        access_token = oauth2.create_access_token(
        data={"sub": db_user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )

        return {
            "message": "Already confirmed",
            "access_token": access_token,
            "token_type": "bearer",
            "next": next_step
            }

    db_user.is_verified = True
    db.commit()
    db.refresh(db_user)

    access_token = oauth2.create_access_token(
        data={"sub": db_user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "next": next_step
        }

@router.get("/{id}", response_model=user.GetUser, status_code=status.HTTP_200_OK)
def get_user(id: int, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user)):

    db_user = db.query(models.User).filter(models.User.user_id == id).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"User with id: {id} doesnt exist")
    
    if db_user.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )
    
    return db_user

@router.patch("/{id}", response_model=user.GetUser, status_code=status.HTTP_202_ACCEPTED)
def update_user(id: int, request: user.UpdateUser, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user)):
    
    db_user = db.query(models.User).filter(models.User.user_id == id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with id: {id} not found")
    
    if db_user.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if key == "profile_image_url" and value is None:
            value = settings.default_profile_image_url
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    return db_user

@router.post("/{id}/profile-image", status_code=status.HTTP_200_OK)
async def upload_profile_image(id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user)):

    db_user = db.query(models.User).filter(models.User.user_id == id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if db_user.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action",
        )

    image_url = await save_image_local(file=file, category="users", owner_id=id)
    db_user.profile_image_url = image_url
    db.commit()
    db.refresh(db_user)

    return {"profile_image_url": db_user.profile_image_url}