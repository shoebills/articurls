import jwt
from fastapi import Depends, APIRouter, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from .. import models
from ..security import hashing, oauth2
from ..schemas import user
from ..schemas import page as page_schema
from ..email.service import send_verify_new_user
from ..email.welcome import (
    render_welcome_email,
    sanitize_welcome_body,
    sanitize_welcome_subject,
    validate_delay_minutes,
)
from datetime import timedelta
from ..config import settings
from fastapi import UploadFile, File
from ..storage.service import (
    FREE_STORAGE_LIMIT_BYTES,
    _verify_magic_bytes,
    ensure_user_storage_quota,
    get_user_storage_usage_bytes,
    save_image_local,
)
from ..umami.service import enqueue_umami_provision
from ..utils import (
    assert_admin_email,
    is_admin_email,
    RequestContext,
    apply_username_change_or_raise,
    claim_username_or_raise,
    normalize_email,
    is_pro_entitled,
    require_pro,
    user_by_email,
    user_by_username,
    validate_username_or_raise,
    public_blog_home_url,
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
                           meta_title=f"{request.name}'s Blog",
                           meta_description=f"Explore all the blogs published by {request.name} on Articurls.",
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

    enqueue_umami_provision(new_user.user_id)

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

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_user.navbar_enabled = request.navbar_enabled
    db_user.nav_blog_name = (request.nav_blog_name or "").strip() or None
    db_user.nav_blog_name_size = request.nav_blog_name_size
    db_user.nav_menu_enabled = request.nav_menu_enabled
    db_user.footer_enabled = request.footer_enabled
    db_user.site_footer_enabled = request.site_footer_enabled
    db_user.featured_blogs_enabled = request.featured_blogs_enabled
    
    blog_ids = request.featured_blog_ids or []
    if len(blog_ids) > 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 10 featured blogs allowed")
    
    if blog_ids:
        owned_ids = {b[0] for b in db.query(models.Blog.blog_id).filter(
            models.Blog.user_id == current_user.user_id,
            models.Blog.blog_id.in_(blog_ids),
        ).all()}
        db_user.featured_blog_ids = [bid for bid in blog_ids if bid in owned_ids]
    else:
        db_user.featured_blog_ids = []
        
    db.commit()
    db.refresh(db_user)

    # Design settings affect public homepage chrome/content (header, featured
    # posts, about/footer), so purge the same homepage/listing cache tags used
    # by public blog updates instead of requiring a manual Cloudflare purge.
    schedule_homepage_purge(background_tasks, db_user)

    return db_user


@router.get("/meta", response_model=user.MetaSettings, status_code=status.HTTP_200_OK)
def get_meta_settings(db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user)):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.patch("/meta", response_model=user.MetaSettings, status_code=status.HTTP_202_ACCEPTED)
def update_meta_settings(
    request: user.MetaSettingsUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

    if "meta_title" in update_data:
        db_user.meta_title = (update_data["meta_title"] or "").strip() or None
    if "meta_description" in update_data:
        db_user.meta_description = (update_data["meta_description"] or "").strip() or None
    rss_changed = "rss_enabled" in update_data
    if rss_changed:
        db_user.rss_enabled = bool(update_data["rss_enabled"])

    db.commit()
    db.refresh(db_user)

    if rss_changed:
        schedule_tenant_purge(background_tasks, db_user)

    return db_user


@router.patch("/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_user(
    request: user.UpdateUser,
    req: Request,
    background_tasks: BackgroundTasks,
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

    name_changed = "name" in update_data and update_data["name"] != db_user.name
    username_changed = "user_name" in update_data and update_data["user_name"] is not None
    pfp_changed = "profile_image_url" in update_data

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

    if name_changed or username_changed or pfp_changed:
        schedule_tenant_purge(background_tasks, db_user)

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


@router.get("/welcome-email", response_model=user.WelcomeEmailSettings, status_code=status.HTTP_200_OK)
def get_welcome_email_settings(
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
    is_pro=Depends(require_pro),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.patch("/welcome-email", response_model=user.WelcomeEmailSettings, status_code=status.HTTP_202_ACCEPTED)
def update_welcome_email_settings(
    request: user.WelcomeEmailSettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
    is_pro=Depends(require_pro),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

    try:
        if "welcome_email_subject" in update_data:
            update_data["welcome_email_subject"] = sanitize_welcome_subject(
                update_data["welcome_email_subject"]
            )
        if "welcome_email_body_html" in update_data:
            update_data["welcome_email_body_html"] = sanitize_welcome_body(
                update_data["welcome_email_body_html"]
            )
        if "welcome_email_delay_minutes" in update_data and update_data["welcome_email_delay_minutes"] is not None:
            update_data["welcome_email_delay_minutes"] = validate_delay_minutes(
                int(update_data["welcome_email_delay_minutes"])
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/welcome-email/preview", response_model=user.WelcomeEmailPreviewOut, status_code=status.HTTP_200_OK)
def preview_welcome_email(
    request: user.WelcomeEmailPreviewIn,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
    is_pro=Depends(require_pro),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    blog_name = db_user.name
    blog_url = public_blog_home_url(db_user)
    unsubscribe_url = f"{settings.public_base_url.rstrip('/')}/unsubscribe?token=preview"

    custom_body = None
    if not request.use_default_body:
        try:
            custom_body = sanitize_welcome_body(request.welcome_email_body_html)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    subject, html = render_welcome_email(
        blog_name=blog_name,
        blog_url=blog_url,
        unsubscribe_url=unsubscribe_url,
        custom_subject=request.welcome_email_subject,
        custom_body_html=custom_body,
    )
    return {"subject": subject, "html": html}


@router.patch("/pro/me", response_model=user.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def update_pro_user(request: user.UpdateProUser, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user = Depends(oauth2.get_current_user), is_pro = Depends(require_pro)):
    
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    schedule_tenant_purge(background_tasks, db_user)

    return db_user


@router.post("/me/profile-image", status_code=status.HTTP_200_OK)
async def upload_profile_image(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks(), db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user)):

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    image_url = await save_image_local(file=file, category="users", user_id=current_user.user_id, db=db)
    db_user.profile_image_url = image_url
    db.commit()
    db.refresh(db_user)

    schedule_tenant_purge(background_tasks, db_user)

    return {"profile_image_url": db_user.profile_image_url}





FAVICON_MAX_BYTES = 256 * 1024  # 256KB
FAVICON_ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/x-icon"}


@router.post("/me/favicon", status_code=status.HTTP_200_OK)
async def upload_favicon(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
    is_pro=Depends(require_pro),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

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
    ensure_user_storage_quota(db, current_user.user_id, len(data))

    from uuid import uuid4
    from ..storage.service import _get_storage_provider, _ext_from_content_type, StoredMedia

    ext_map = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/x-icon": ".ico"}
    ext = ext_map.get(content_type, _ext_from_content_type(content_type))
    filename = f"{uuid4().hex}{ext}"
    storage_key = f"favicons/{current_user.user_id}/{filename}"

    provider = _get_storage_provider()
    stored = provider.save(data=data, storage_key=storage_key)

    db_user.favicon_url = stored.url
    db.commit()
    db.refresh(db_user)

    schedule_tenant_purge(background_tasks, db_user)

    return {"favicon_url": db_user.favicon_url}


@router.get("/storage", response_model=user.StorageUsage, status_code=status.HTTP_200_OK)
def get_storage_usage(
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_pro = is_pro_entitled(db_user, db)
    used_bytes = get_user_storage_usage_bytes(db, current_user.user_id)
    return {
        "used_bytes": used_bytes,
        "limit_bytes": None if is_pro else FREE_STORAGE_LIMIT_BYTES,
        "is_unlimited": bool(is_pro),
    }


@router.delete("/me/favicon", status_code=status.HTTP_200_OK)
async def delete_favicon(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_user.favicon_url = None
    db.commit()
    db.refresh(db_user)

    schedule_tenant_purge(background_tasks, db_user)

    return {"favicon_url": None}
