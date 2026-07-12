from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.orm import Session
from ..database import get_db
from ..utils import user_by_email
from ..schemas import token, authentication
from ..security import hashing, oauth2
from ..config import settings
from ..email.service import send_password_reset, send_verify_new_user
from ..utils import normalize_email
from ..utils.rate_limit import check_rate_limit_ip_and_email, check_rate_limit_ip
from fastapi.responses import RedirectResponse

router = APIRouter(
    tags=["Authentication"]
)

_LOGIN_IP_LIMIT = 20
_LOGIN_IP_WINDOW = 900        # 15 minutes
_LOGIN_EMAIL_LIMIT = 10
_LOGIN_EMAIL_WINDOW = 900     # 15 minutes

_PW_RESET_IP_LIMIT = 5
_PW_RESET_IP_WINDOW = 600     # 10 minutes
_PW_RESET_EMAIL_LIMIT = 3
_PW_RESET_EMAIL_WINDOW = 3600 # 1 hour

_REFRESH_IP_LIMIT = 30
_REFRESH_IP_WINDOW = 60       # 1 minute

_PW_RESET_VERIFY_IP_LIMIT = 10
_PW_RESET_VERIFY_IP_WINDOW = 900  # 15 minutes

_RESEND_VERIFY_IP_LIMIT = 5
_RESEND_VERIFY_IP_WINDOW = 600     # 10 minutes
_RESEND_VERIFY_EMAIL_LIMIT = 3
_RESEND_VERIFY_EMAIL_WINDOW = 3600 # 1 hour


@router.post("/login", response_model=token.Token)
def login(response: Response, request: OAuth2PasswordRequestForm = Depends(), req: Request = None, db: Session = Depends(get_db)):

    email = normalize_email(request.username)

    if req:
        check_rate_limit_ip_and_email(
            req, "login", email,
            _LOGIN_IP_LIMIT, _LOGIN_IP_WINDOW,
            _LOGIN_EMAIL_LIMIT, _LOGIN_EMAIL_WINDOW,
        )

    db_user = user_by_email(db, email)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect")
    
    if not hashing.verify_password(request.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect")
    
    if not db_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified. Check your mailbox for email verification link")
    access_token = oauth2.create_access_token(
        data={"sub": db_user.email, "ver": db_user.token_version},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    refresh_token = oauth2.create_refresh_token(db_user.email)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True, # assumes HTTPS
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=token.Token)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    check_rate_limit_ip(request, "refresh", _REFRESH_IP_LIMIT, _REFRESH_IP_WINDOW)

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
        
    payload = oauth2.verify_refresh_token(refresh_token)
    email = payload.get("sub")
    
    db_user = user_by_email(db, email)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    oauth2.revoke_refresh_token(refresh_token)
    
    new_access_token = oauth2.create_access_token(
        data={"sub": email, "ver": db_user.token_version},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    new_refresh_token = oauth2.create_refresh_token(email)
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        oauth2.revoke_refresh_token(refresh_token)
        
    response.delete_cookie(key="refresh_token", httponly=True, secure=True, samesite="lax", path="/")
    return {"message": "Logged out successfully"}

@router.post("/request-password-reset")
def request_password_reset(request: authentication.RequestPasswordReset, req: Request, db: Session = Depends(get_db)):

    email = normalize_email(str(request.email))

    if req:
        check_rate_limit_ip_and_email(
            req, "pwreset", email,
            _PW_RESET_IP_LIMIT, _PW_RESET_IP_WINDOW,
            _PW_RESET_EMAIL_LIMIT, _PW_RESET_EMAIL_WINDOW,
        )

    db_user = user_by_email(db, email)

    if db_user:
        reset_token = oauth2.create_reset_password_token(db_user.email)
        send_password_reset(db_user.email, reset_token)

    return {"message": "If the email exists, you will receive a reset token shortly."}

@router.post("/resend-verification-email")
def resend_verification_email(request: authentication.ResendVerificationEmail, req: Request, db: Session = Depends(get_db)):
    email = normalize_email(str(request.email))

    check_rate_limit_ip_and_email(
        req, "resend-verify", email,
        _RESEND_VERIFY_IP_LIMIT, _RESEND_VERIFY_IP_WINDOW,
        _RESEND_VERIFY_EMAIL_LIMIT, _RESEND_VERIFY_EMAIL_WINDOW,
    )

    db_user = user_by_email(db, email)

    if db_user and not db_user.email_verified:
        verify_token = oauth2.create_new_user_token(email)
        send_verify_new_user(email, db_user.name, verify_token)

    return {"message": "If your account exists and is not yet verified, a new verification link has been sent."}

@router.post("/reset-password")
def reset_password(request: authentication.ResetPassword, req: Request, db: Session = Depends(get_db)):
    check_rate_limit_ip(req, "pwreset-verify", _PW_RESET_VERIFY_IP_LIMIT, _PW_RESET_VERIFY_IP_WINDOW)

    try:
        payload = oauth2.verify_reset_password_token(request.token)
        email = payload.get("email")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    db_user = user_by_email(db, email)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.password = hashing.get_password_hash(request.new_password)
    db_user.token_version += 1
    db.commit()

    return {"message": "Password updated successfully"}

@router.get("/reset-password", include_in_schema=False)
def reset_password_form(token: str):
    target = f"{settings.app_base_url.rstrip('/')}/reset-password?token={token}"
    return RedirectResponse(url=target, status_code=status.HTTP_307_TEMPORARY_REDIRECT)