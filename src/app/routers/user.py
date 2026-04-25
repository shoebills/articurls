import jwt
from fastapi import Depends, APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from .. import models
from ..security import hashing, oauth2
from ..schemas import user
from ..schemas import page as page_schema
from ..email.service import send_verify_new_user
from datetime import timedelta
from ..config import settings
from fastapi import UploadFile, File
from ..storage.service import save_image_local
from ..utils import (
    assert_admin_email,
    is_admin_email,
    RequestContext,
    apply_username_change_or_raise,
    claim_username_or_raise,
    normalize_email,
    require_pro,
    user_by_email,
    user_by_username,
    validate_username_or_raise,
)

router = APIRouter(
    tags=["User"],
    prefix="/user"
)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(request: user.CreateUser, req: Request, db: Session = Depends(get_db)):

    email = normalize_email(str(request.email))
    user_name = validate_username_or_raise(request.user_name)

    db_email = user_by_email(db, email)

    if db_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered")
    
    db_user_name = user_by_username(db, user_name)
    
    if db_user_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered")
    
    hashed_password = hashing.get_password_hash(request.password)
    
    new_user = models.User(name=request.name, 
                           user_name=user_name, 
                           email=email, 
                           password=hashed_password, 
                           seo_title=f"{request.name}'s Blog",
                           seo_description=f"Explore all the blogs published by {request.name} on Articurls.",
                           profile_image_url=settings.default_profile_image_url)

    db.add(new_user)
    db.flush()
    claim_username_or_raise(db, new_user.user_id, user_name)
    db.add(
        models.UsernameChangeAudit(
            user_id=new_user.user_id,
            old_username=user_name,
            new_username=user_name,
            actor_user_id=new_user.user_id,
            actor_email=email,
            is_admin_override=False,
            reason="account_created",
            request_ip=req.client.host if req.client else None,
            user_agent=req.headers.get("user-agent"),
        )
    )
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
    
    setattr(db_user, "is_admin", is_admin_email(db_user.email))
    return db_user


@router.get("/username-availability", status_code=status.HTTP_200_OK)
def username_availability(
    user_name: str,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    try:
        normalized = validate_username_or_raise(user_name)
    except HTTPException as ex:
        return {
            "available": False,
            "normalized": "",
            "reason": ex.detail if isinstance(ex.detail, str) else "Invalid username",
        }

    existing_user = user_by_username(db, normalized)
    if existing_user and existing_user.user_id != current_user.user_id:
        return {"available": False, "normalized": normalized, "reason": "taken"}

    return {"available": True, "normalized": normalized, "reason": None}


@router.get("/design", response_model=page_schema.DesignSettings, status_code=status.HTTP_200_OK)
def get_design_settings(db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user)):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.patch("/design", response_model=page_schema.DesignSettings, status_code=status.HTTP_202_ACCEPTED)
def update_design_settings(
    request: page_schema.DesignSettings,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_user.navbar_enabled = request.navbar_enabled
    db_user.nav_blog_name = (request.nav_blog_name or "").strip() or None
    db_user.nav_menu_enabled = request.nav_menu_enabled
    db_user.footer_enabled = request.footer_enabled
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/seo", response_model=user.SeoSettings, status_code=status.HTTP_200_OK)
def get_seo_settings(db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user)):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.patch("/seo", response_model=user.SeoSettings, status_code=status.HTTP_202_ACCEPTED)
def update_seo_settings(
    request: user.SeoSettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

    if "seo_title" in update_data:
        db_user.seo_title = (update_data["seo_title"] or "").strip() or None
    if "seo_description" in update_data:
        db_user.seo_description = (update_data["seo_description"] or "").strip() or None

    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/monetization", response_model=user.MonetizationSettings, status_code=status.HTTP_200_OK)
def get_monetization_settings(db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user)):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.patch("/monetization", response_model=user.MonetizationSettings, status_code=status.HTTP_202_ACCEPTED)
def update_monetization_settings(
    request: user.MonetizationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
    is_pro=Depends(require_pro),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)
    if "ad_frequency" in update_data and update_data["ad_frequency"] is not None:
        ad_frequency = int(update_data["ad_frequency"])
        if ad_frequency < 2 or ad_frequency > 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ad frequency must be between 2 and 10.")
        db_user.ad_frequency = ad_frequency

    if "ad_code" in update_data:
        db_user.ad_code = (update_data["ad_code"] or "").strip() or None

    if "ads_enabled" in update_data:
        requested_enabled = bool(update_data["ads_enabled"])
        if requested_enabled and not (db_user.ad_code and db_user.ad_code.strip()):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Save ad code before enabling ads.")
        db_user.ads_enabled = requested_enabled

    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_user(
    request: user.UpdateUser,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] is not None:
        update_data["email"] = normalize_email(str(update_data["email"]))

    if "contact_email" in update_data and update_data["contact_email"] is not None:
        update_data["contact_email"] = normalize_email(str(update_data["contact_email"]))

    if "user_name" in update_data and update_data["user_name"] is not None:
        apply_username_change_or_raise(
            db,
            db_user=db_user,
            new_username_raw=update_data.pop("user_name"),
            actor_user_id=current_user.user_id,
            actor_email=current_user.email,
            request_context=RequestContext(
                ip=req.client.host if req.client else None,
                user_agent=req.headers.get("user-agent"),
            ),
            is_admin_override=False,
            reason="self_service",
        )

    if "bio" in update_data and update_data["bio"] is not None:
        word_count = len(update_data["bio"].split())
        if word_count > 200:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Bio must be 200 words or fewer",
            )

    for key, value in update_data.items():
        if key == "profile_image_url" and value is None:
            # Keep a default avatar instead of leaving profile photo empty.
            value = settings.default_profile_image_url
        setattr(db_user, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    db.refresh(db_user)

    return db_user


@router.patch("/admin/{target_user_id}/username", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def admin_change_username(
    target_user_id: int,
    request: user.AdminUsernameChange,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    assert_admin_email(current_user.email)

    db_user = db.query(models.User).filter(models.User.user_id == target_user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    apply_username_change_or_raise(
        db,
        db_user=db_user,
        new_username_raw=request.user_name,
        actor_user_id=current_user.user_id,
        actor_email=current_user.email,
        request_context=RequestContext(
            ip=req.client.host if req.client else None,
            user_agent=req.headers.get("user-agent"),
        ),
        is_admin_override=True,
        reason=(request.reason or "").strip() or "admin_override",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    db.refresh(db_user)
    return db_user


@router.post("/username-change-requests", response_model=user.UsernameChangeRequestOut, status_code=status.HTTP_201_CREATED)
def create_username_change_request(
    request: user.UsernameChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    desired = validate_username_or_raise(request.desired_username)
    claim = db.query(models.UsernameClaim).filter(models.UsernameClaim.username == desired).first()
    if claim and claim.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is taken.")
    if desired == current_user.user_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New username must be different.")
    existing_pending = (
        db.query(models.UsernameChangeRequest)
        .filter(
            models.UsernameChangeRequest.user_id == current_user.user_id,
            models.UsernameChangeRequest.status == "pending",
        )
        .first()
    )
    if existing_pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have a pending request.")
    row = models.UsernameChangeRequest(
        user_id=current_user.user_id,
        desired_username=desired,
        reason=(request.reason or "").strip() or None,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/username-change-requests", response_model=list[user.UsernameChangeRequestOut], status_code=status.HTTP_200_OK)
def list_my_username_change_requests(
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    return (
        db.query(models.UsernameChangeRequest)
        .filter(models.UsernameChangeRequest.user_id == current_user.user_id)
        .order_by(models.UsernameChangeRequest.created_at.desc())
        .all()
    )

@router.patch("/pro/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_pro_user(request: user.UpdateProUser, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user), is_pro = Depends(require_pro)):
    
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

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