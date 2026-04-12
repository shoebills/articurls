import jwt
from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError
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
from ..utils import normalize_email, require_pro, user_by_email
from ..domains import normalize_custom_domain, verify_custom_domain_dns

router = APIRouter(
    tags=["User"],
    prefix="/user"
)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(request: user.CreateUser, db: Session = Depends(get_db)):

    email = normalize_email(str(request.email))

    db_email = user_by_email(db, email)

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
                           email=email, 
                           password=hashed_password, 
                           seo_title=f"{request.name}'s Blog",
                           seo_description=f"Explore all the blogs published by {request.name} on Articurls.",
                           profile_image_url=settings.default_profile_image_url)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    verify_token = oauth2.create_new_user_token(email)
    plan_choice = request.plan_choice
    send_verify_new_user(email, request.name, verify_token, plan_choice)

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

    db_user = user_by_email(db, payload.get("email"))

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if plan_choice not in ("free", "pro"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan_choice; use 'free' or 'pro'"
            )
    
    next_step = "checkout" if plan_choice == "pro" else "dashboard"

    if db_user.email_verified:
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

    db_user.email_verified = True
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

@router.get("/me", response_model=user.UserSettings, status_code=status.HTTP_200_OK)
def get_user(db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user)):

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return db_user

@router.patch("/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_user(request: user.UpdateUser, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user)):
    
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] is not None:
        update_data["email"] = normalize_email(str(update_data["email"]))

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    return db_user

@router.patch("/pro/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_pro_user(request: user.UpdateProUser, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user), is_pro = Depends(require_pro)):
    
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

    if "custom_domain" in update_data:
        new_norm = normalize_custom_domain(update_data["custom_domain"])
        old_norm = normalize_custom_domain(db_user.custom_domain)
        update_data["custom_domain"] = new_norm
        if new_norm != old_norm:
            db_user.is_domain_verified = False

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    return db_user

@router.post("/me/profile-image", status_code=status.HTTP_200_OK)
async def upload_profile_image(file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user)):

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    image_url = await save_image_local(file=file, category="users", user_id=current_user.user_id)
    db_user.profile_image_url = image_url
    db.commit()
    db.refresh(db_user)

    return {"profile_image_url": db_user.profile_image_url}

@router.post("/pro/me/custom-domain/verify", response_model=user.UserSettings, status_code=status.HTTP_200_OK)
def verify_custom_domain(db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user), is_pro=Depends(require_pro)):

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not normalize_custom_domain(db_user.custom_domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set a custom domain first (PATCH /user/pro/me with custom_domain), then verify.",
        )

    if not settings.custom_domain_cname_target:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Custom domain verification is not configured on the server (CUSTOM_DOMAIN_CNAME_TARGET).",
        )

    try:
        verify_custom_domain_dns(
            db_user.custom_domain, settings.custom_domain_cname_target
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None

    db_user.is_domain_verified = True
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already verified on another account.",
        ) from None

    db.refresh(db_user)
    return db_user