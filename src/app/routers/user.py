import jwt
from fastapi import Depends, APIRouter, HTTPException, Request, Response, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, utils
from ..security import hashing, oauth2
from ..security.oauth2 import get_current_site
from ..utils.serialization import user_settings_out
from ..schemas import user
from ..schemas.token import Token
from ..schemas import page as page_schema
from ..email.service import send_verify_new_user
from datetime import datetime, timedelta, timezone
from ..config import settings
from fastapi import UploadFile, File
from ..storage.service import (
    _verify_magic_bytes,
    get_user_storage_usage_bytes,
    save_image_local,
)
from ..utils import (
    normalize_email,
    user_by_email,
)
from ..cache.service import schedule_homepage_purge, schedule_tenant_purge
from ..utils.rate_limit import check_rate_limit_ip

router = APIRouter(
    tags=["User"],
    prefix="/user"
)

_SIGNUP_IP_LIMIT = 5
_SIGNUP_IP_WINDOW = 3600  # 1 hour

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(request: user.CreateUser, req: Request, db: Session = Depends(get_db)):

    check_rate_limit_ip(req, "signup", _SIGNUP_IP_LIMIT, _SIGNUP_IP_WINDOW)

    email = normalize_email(str(request.email))

    db_email = user_by_email(db, email)

    if db_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered")

    hashed_password = hashing.get_password_hash(request.password)

    new_user = models.User(
        name=request.name,
        email=request.email,
        password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    verify_token = oauth2.create_new_user_token(email)
    send_verify_new_user(email, request.name, verify_token)

    return {"message": "Please check your mailbox to verify your email!"}

@router.get("/verify-new-user", status_code=status.HTTP_200_OK)
def verify_new_user(token: str, db: Session = Depends(get_db)):

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

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation link",
        )

    if db_user.email_verified:
        access_token = oauth2.create_access_token(
        data={"sub": db_user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )

        return {
            "message": "Already confirmed",
            "access_token": access_token,
            "token_type": "bearer"
            }

    db_user.email_verified = True

    # Trial starts at verification — create the 7-day trial now.
    existing_sub = db.query(models.Subscriptions).filter(
        models.Subscriptions.user_id == db_user.user_id
    ).first()
    if existing_sub is None:
        trial_start = datetime.now(timezone.utc)
        trial_end = trial_start + timedelta(days=settings.trial_duration_days)
        db.add(models.Subscriptions(
            user_id=db_user.user_id,
            plan_type="trial",
            status="active",
            current_period_start=trial_start,
            current_period_end=trial_end,
        ))

    db.commit()
    db.refresh(db_user)

    access_token = oauth2.create_access_token(
        data={"sub": db_user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
        }

@router.get("/me", response_model=user.UserSettings, status_code=status.HTTP_200_OK)
def get_user(db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site)):
    return user_settings_out(db, current_user, current_site)


@router.get("/design", response_model=page_schema.DesignSettings, status_code=status.HTTP_200_OK)
def get_design_settings(db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    return current_site


@router.patch("/design", response_model=page_schema.DesignSettings, status_code=status.HTTP_202_ACCEPTED)
def update_design_settings(request: page_schema.DesignSettings, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    update_data = request.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(current_site, key, value)
        db.commit()
        db.refresh(current_site)
        schedule_tenant_purge(background_tasks, current_site)
    return current_site


@router.get("/seo", response_model=user.SeoSettings, status_code=status.HTTP_200_OK)
def get_seo_settings(db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    return current_site


@router.patch("/seo", response_model=user.SeoSettings, status_code=status.HTTP_202_ACCEPTED)
def update_seo_settings(request: user.SeoSettingsUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    update_data = request.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(current_site, key, value)
        db.commit()
        db.refresh(current_site)
        schedule_tenant_purge(background_tasks, current_site)
    return current_site


@router.get("/seo/advanced", response_model=user.SeoAdvancedSettings, status_code=status.HTTP_200_OK)
def get_seo_advanced_settings(db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    return current_site


@router.patch("/seo/advanced", response_model=user.SeoAdvancedSettings, status_code=status.HTTP_202_ACCEPTED)
def update_seo_advanced_settings(request: user.SeoAdvancedUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    update_data = request.model_dump(exclude_unset=True)
    if not update_data:
        return current_site
    for key, value in update_data.items():
        setattr(current_site, key, value)
    if current_site.seo_robots_mode != "custom":
        current_site.seo_robots_custom = None
    if current_site.seo_llms_mode != "custom":
        current_site.seo_llms_custom = None
    db.commit()
    db.refresh(current_site)
    schedule_tenant_purge(background_tasks, current_site)
    return current_site


@router.patch("/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_user(request: user.UpdateUser, db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    update_data = request.model_dump(exclude_unset=True)
    if not update_data:
        return user_settings_out(db, current_user, current_site)

    user_fields = ["name", "email"]
    site_fields = ["meta_title", "meta_description"]

    for key, value in update_data.items():
        if key in user_fields:
            setattr(current_user, key, value)
        elif key in site_fields:
            setattr(current_site, key, value)
        elif key == "profile_image_url":
            setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    db.refresh(current_site)
    
    return user_settings_out(db, current_user, current_site)


@router.patch("/me/password", response_model=Token, status_code=status.HTTP_200_OK)
def update_password(
    request: user.PasswordUpdate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    current_user.password = hashing.get_password_hash(request.new_password)
    current_user.token_version = (current_user.token_version or 0) + 1
    db.commit()
    db.refresh(current_user)

    access_token = oauth2.create_access_token(
        data={"sub": current_user.email, "ver": current_user.token_version},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = oauth2.create_refresh_token(current_user.email)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.patch("/pro/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_pro_user(request: user.UpdateProUser, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user), current_site: models.Site=Depends(get_current_site)):
    if not utils.is_pro_entitled(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    update_data = request.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(current_site, key, value)
        db.commit()
        db.refresh(current_site)
        
        schedule_tenant_purge(background_tasks, current_site)
    
    return user_settings_out(db, current_user, current_site)


@router.post("/me/profile-image", status_code=status.HTTP_200_OK)
async def upload_profile_image(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks(), db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site)):

    image_url = await save_image_local(file=file, category="users", user_id=current_user.user_id, db=db)
    current_user.profile_image_url = image_url
    db.commit()
    db.refresh(current_user)

    schedule_tenant_purge(background_tasks, current_site)

    return {"profile_image_url": current_user.profile_image_url}





FAVICON_MAX_BYTES = 256 * 1024  # 256KB
FAVICON_ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/x-icon"}


@router.post("/me/favicon", status_code=status.HTTP_200_OK)
async def upload_favicon(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site),
):
    
    

    data = await file.read()
    content_type = file.content_type or ""

    if content_type not in FAVICON_ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only png, jpg, webp, and ico images are allowed for favicons.",
        )
    if len(data) > FAVICON_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Favicon too large (max 256KB).",
        )
    if not _verify_magic_bytes(data, content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match the claimed image type",
        )

    from uuid import uuid4
    from ..storage.service import _get_storage_provider, _ext_from_content_type, StoredMedia

    ext_map = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/x-icon": ".ico"}
    ext = ext_map.get(content_type, _ext_from_content_type(content_type))
    filename = f"{uuid4().hex}{ext}"
    storage_key = f"favicons/{current_user.user_id}/{filename}"

    provider = _get_storage_provider()
    stored = provider.save(data=data, storage_key=storage_key)

    current_site.favicon_url = stored.url
    db.commit()
    db.refresh(current_site)

    schedule_tenant_purge(background_tasks, current_site)

    return {"favicon_url": current_site.favicon_url}


@router.get("/storage", response_model=user.StorageUsage, status_code=status.HTTP_200_OK)
def get_storage_usage(
    db: Session = Depends(get_db),
    current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site),
):
    used_bytes = get_user_storage_usage_bytes(db, current_user.user_id)
    return {
        "used_bytes": used_bytes,
        "limit_bytes": None,
        "is_unlimited": True,
    }


@router.delete("/me/favicon", status_code=status.HTTP_200_OK)
async def delete_favicon(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site),
):
    current_site.favicon_url = None
    db.commit()
    db.refresh(current_site)

    schedule_tenant_purge(background_tasks, current_site)

    return {"favicon_url": None}


@router.post("/me/logo", status_code=status.HTTP_200_OK)
async def upload_logo(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site),
):
    logo_url = await save_image_local(file=file, category="logos", user_id=current_user.user_id, db=db)
    current_site.logo_url = logo_url
    db.commit()
    db.refresh(current_site)

    schedule_tenant_purge(background_tasks, current_site)

    return {"logo_url": current_site.logo_url}


@router.delete("/me/logo", status_code=status.HTTP_200_OK)
async def delete_logo(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site),
):
    current_site.logo_url = None
    db.commit()
    db.refresh(current_site)

    schedule_tenant_purge(background_tasks, current_site)

    return {"logo_url": None}


@router.post("/seo/og-image", status_code=status.HTTP_200_OK)
async def upload_og_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site),
):
    
    

    og_image_url = await save_image_local(file=file, category="og-images", user_id=current_user.user_id, db=db)
    current_site.og_image_url = og_image_url
    db.commit()
    db.refresh(current_site)

    schedule_tenant_purge(background_tasks, current_site)

    return {"og_image_url": current_site.og_image_url}


@router.delete("/seo/og-image", status_code=status.HTTP_200_OK)
async def delete_og_image(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(oauth2.get_current_user), current_site: models.Site = Depends(get_current_site),
):
    
    

    current_site.og_image_url = None
    db.commit()
    db.refresh(current_site)

    schedule_tenant_purge(background_tasks, current_site)

    return {"og_image_url": None}
