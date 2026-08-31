import jwt
import uuid
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from ..config import settings
from ..database import get_db
from .. import models
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRATION_MINUTES = settings.access_token_expire_minutes


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def create_access_token(data: dict, expires_delta: timedelta | None = None):

    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRATION_MINUTES)

    to_encode.update({"exp": expire, "purpose": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from ..utils import user_by_email

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        purpose: str = payload.get("purpose")

        if email is None or purpose != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Could not validate credentials"
            )
        
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Could not validate credentials"
        )

    db_user = user_by_email(db, email)

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Could not validate credentials"
        )

    token_ver = payload.get("ver")
    if token_ver is not None and token_ver != db_user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    return db_user


def get_current_site(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
) -> models.Site:
    site_id_raw = request.headers.get("X-Site-ID")
    if not site_id_raw:
        site = (
            db.query(models.Site)
            .filter(models.Site.user_id == current_user.user_id)
            .order_by(models.Site.created_at.asc())
            .first()
        )
        if not site:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
        return site

    try:
        site_id = uuid.UUID(str(site_id_raw))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid X-Site-ID format",
        )
    site = db.query(models.Site).filter(
        models.Site.site_id == site_id,
        models.Site.user_id == current_user.user_id
    ).first()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site

def create_refresh_token(email: str):
    from ..redis_client import redis_client
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    jti = str(uuid.uuid4())
    
    payload = {
        "sub": email,
        "purpose": "refresh",
        "exp": expire,
        "jti": jti
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    # Store jti in redis
    # Using ex parameter for expiry in seconds
    expiry_seconds = settings.refresh_token_expire_days * 24 * 60 * 60
    redis_client.set(f"refresh_token:{jti}", "valid", ex=expiry_seconds)
    
    return token

def verify_refresh_token(token: str):
    from ..redis_client import redis_client
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("purpose") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token purpose")
            
        jti = payload.get("jti")
        if not jti:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
            
        is_valid = redis_client.get(f"refresh_token:{jti}")
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked or expired")
            
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

def revoke_refresh_token(token: str):
    from ..redis_client import redis_client
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        if jti:
            redis_client.delete(f"refresh_token:{jti}")
    except jwt.PyJWTError:
        pass

def create_new_user_token(email: str):

    expire = datetime.now(timezone.utc) + timedelta(hours=24)

    payload = {
        "email": email,
        "purpose": "verify-user",
        "exp": expire
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token

def verify_new_user_token(token: str):

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    if payload.get("purpose") != "verify-user":
        raise ValueError("Invalid token purpose")
    
    return payload

def create_unsubscribe_token(subscriber_id: uuid.UUID | str, site_id: uuid.UUID | str):
    expire = datetime.now(timezone.utc) + timedelta(days=30)

    payload = {
        "subscriber_id": str(subscriber_id),
        "site_id": str(site_id),
        "user_id": str(site_id),  # fallback for backward compatibility
        "purpose": "unsubscribe",
        "exp": expire,
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return token

def verify_unsubscribe_token(token: str):

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    if payload.get("purpose") != "unsubscribe":
        raise ValueError("Invalid token purpose")
    
    return payload

def create_sub_confirm_token(subscriber_id: uuid.UUID | str, site_id: uuid.UUID | str):
    expire = datetime.now(timezone.utc) + timedelta(days=30)

    payload = {
        "subscriber_id": str(subscriber_id),
        "site_id": str(site_id),
        "user_id": str(site_id),  # fallback for backward compatibility
        "purpose": "confirm-subscription",
        "exp": expire,
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return token

def verify_sub_confirm_token(token: str):

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    if payload.get("purpose") != "confirm-subscription":
        raise ValueError("Invalid token purpose")
    
    return payload

def create_reset_password_token(email: str):
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {
        "email": email,
        "purpose": "reset-password",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_reset_password_token(token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    if payload.get("purpose") != "reset-password":
        raise ValueError("Invalid token purpose")

    return payload