from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.orm import Session
from ..database import get_db
from ..utils import user_by_email
from ..schemas import token, authentication
from ..security import hashing, oauth2
from ..config import settings
from ..email.service import send_password_reset
from fastapi.responses import HTMLResponse
import html as html_lib
from pathlib import Path

router = APIRouter(
    tags=["Authentication"]
)

@router.post("/login", response_model=token.Token)
def login(request: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    db_user = user_by_email(db, request.username)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid Credentials")
    
    if not hashing.verify_password(request.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Credentials")
    
    if not db_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified. Check your mailbox for email verification link")
    
    access_token = oauth2.create_access_token(
        data={"sub": db_user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/request-password-reset")
def request_password_reset(request: authentication.RequestPasswordReset, db: Session = Depends(get_db),):

    db_user = user_by_email(db, request.email)

    if db_user:
        reset_token = oauth2.create_reset_password_token(db_user.email)
        send_password_reset(db_user.email, reset_token)

    return {"message": "If the email exists, you will receive a reset token shortly."}

@router.post("/reset-password")
def reset_password(request: authentication.ResetPassword, db: Session = Depends(get_db)):

    try:
        payload = oauth2.verify_reset_password_token(request.token)
        email = payload.get("email")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    db_user = user_by_email(db, email)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.password = hashing.get_password_hash(request.new_password)
    db.commit()

    return {"message": "Password updated successfully"}

@router.get("/reset-password", response_class=HTMLResponse, include_in_schema=False)
def reset_password_form(token: str):
    safe_token = html_lib.escape(token)

    template_path = Path(__file__).resolve().parent.parent / "web" / "reset_password_form.html"
    template_html = template_path.read_text()

    rendered = template_html.replace("{{TOKEN}}", safe_token)
    return rendered