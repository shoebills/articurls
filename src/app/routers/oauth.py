"""
Google OAuth router for backend-controlled OAuth flow.

Endpoints:
- GET /auth/google/login - Initiate OAuth flow
- GET /auth/google/callback - Handle OAuth callback
- POST /auth/google/complete - Complete onboarding for new users
"""

from fastapi import APIRouter, HTTPException, status, Response, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta

from ..database import get_db
from ..config import settings
from ..schemas.oauth import GoogleUserInfo, GoogleOAuthSession, CompleteGoogleSignup
from ..schemas.token import Token
from ..security import oauth2, hashing
from ..utils.google_oauth import (
    get_authorization_url,
    validate_state_token,
    exchange_code_for_token,
    get_google_user_info,
    store_oauth_session,
    get_oauth_session,
    generate_session_id,
)
from ..utils import (
    user_by_email,
    normalize_email,
    validate_username_or_raise,
    claim_username_or_raise,
)
from .. import models


router = APIRouter(
    prefix="/auth/google",
    tags=["OAuth"]
)


@router.get("/login")
async def google_login():
    """
    Initiate Google OAuth flow.
    
    Generates a secure state token and redirects to Google's OAuth consent screen.
    
    Returns:
        RedirectResponse: Redirect to Google OAuth authorization URL
    """
    redirect_uri = settings.google_redirect_uri
    
    if not redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    authorization_url, state = get_authorization_url(redirect_uri)
    
    return RedirectResponse(url=authorization_url, status_code=status.HTTP_302_FOUND)


@router.get("/callback")
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
    response: Response = None,
):
    """
    Handle Google OAuth callback.
    
    Validates the OAuth response, retrieves user info from Google,
    and either logs in existing user or creates onboarding session for new user.
    
    Args:
        code: Authorization code from Google
        state: State token for CSRF protection
        error: Error message if OAuth failed
        db: Database session
        response: FastAPI response object
        
    Returns:
        RedirectResponse: Redirect to dashboard or onboarding page
    """
    # Handle OAuth errors
    if error:
        error_url = f"{settings.app_base_url}/login?error=oauth_failed"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
    
    # Validate required parameters
    if not code or not state:
        error_url = f"{settings.app_base_url}/login?error=invalid_request"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
    
    # Validate state token (CSRF protection)
    if not validate_state_token(state):
        error_url = f"{settings.app_base_url}/login?error=invalid_state"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
    
    try:
        # Exchange code for access token
        token_response = await exchange_code_for_token(code, settings.google_redirect_uri)
        access_token = token_response.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to obtain access token"
            )
        
        # Get user info from Google
        google_user = await get_google_user_info(access_token)
        
        # Validate Google user info
        google_id = google_user.get("id")
        email = google_user.get("email")
        verified_email = google_user.get("verified_email", False)
        name = google_user.get("name", "")
        picture = google_user.get("picture")
        
        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user info from Google"
            )
        
        # SECURITY: Only trust verified Google emails
        if not verified_email:
            error_url = f"{settings.app_base_url}/login?error=email_not_verified"
            return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
        
        email = normalize_email(email)
        
        # Check if user exists by google_id
        existing_user = db.query(models.User).filter(
            models.User.google_id == google_id
        ).first()
        
        if existing_user:
            # Existing Google user - log them in
            return await _login_existing_user(existing_user, response, db)
        
        # Check if user exists by email (account linking)
        existing_user_by_email = user_by_email(db, email)
        
        if existing_user_by_email:
            # SAFEGUARD: Check if this user already has a different Google account linked
            if existing_user_by_email.google_id and existing_user_by_email.google_id != google_id:
                # User already linked to a different Google account
                # This prevents accidentally linking a different Google account
                error_url = f"{settings.app_base_url}/login?error=different_google_account"
                return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
            
            # SAFEGUARD: Only link if google_id is not already used by another user
            if not existing_user_by_email.google_id:
                # Check if this google_id is already linked to a different account
                google_id_taken = db.query(models.User).filter(
                    models.User.google_id == google_id,
                    models.User.user_id != existing_user_by_email.user_id
                ).first()
                
                if google_id_taken:
                    # This Google account is already linked to a different email
                    error_url = f"{settings.app_base_url}/login?error=google_account_already_linked"
                    return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
                
                # Safe to link: Link Google account to existing email user
                existing_user_by_email.google_id = google_id
                
                # Update profile picture if not set
                if not existing_user_by_email.profile_image_url or \
                   existing_user_by_email.profile_image_url == settings.default_profile_image_url:
                    if picture:
                        existing_user_by_email.profile_image_url = picture
                
                db.commit()
                db.refresh(existing_user_by_email)
            
            # User exists and is properly linked (or was already linked to this Google account)
            return await _login_existing_user(existing_user_by_email, response, db)
        
        # New user - create onboarding session
        session_id = generate_session_id()
        
        session_data = GoogleOAuthSession(
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
            email_verified=verified_email,
        )
        
        store_oauth_session(session_id, session_data.model_dump())
        
        # Redirect to onboarding page with email and name in URL for display
        from urllib.parse import quote
        onboarding_url = (
            f"{settings.app_base_url}/onboarding?"
            f"session_id={session_id}&"
            f"email={quote(email)}&"
            f"name={quote(name)}"
        )
        return RedirectResponse(url=onboarding_url, status_code=status.HTTP_302_FOUND)
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error in production
        print(f"OAuth callback error: {e}")
        error_url = f"{settings.app_base_url}/login?error=oauth_failed"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)


@router.post("/complete", response_model=Token)
async def complete_google_signup(
    request: CompleteGoogleSignup,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Complete Google OAuth signup by creating user account.
    
    This endpoint is called after the user completes the onboarding form
    with their desired username and password.
    
    Args:
        request: Onboarding completion data (session_id, username, password)
        response: FastAPI response object
        db: Database session
        
    Returns:
        Token: Access token and token type
        
    Raises:
        HTTPException: If session invalid, username taken, or creation fails
    """
    # Retrieve OAuth session data
    session_data = get_oauth_session(request.session_id)
    
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired session"
        )
    
    # Validate session data
    google_id = session_data.get("google_id")
    email = session_data.get("email")
    picture = session_data.get("picture")
    email_verified = session_data.get("email_verified", False)
    
    if not google_id or not email or not email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session data"
        )
    
    # Use the name from the request (user may have edited it)
    name = request.name
    
    # Validate username
    user_name = validate_username_or_raise(request.user_name)
    
    # Check if username is taken
    existing_username = db.query(models.User).filter(
        models.User.user_name == user_name
    ).first()
    
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Check if email is now taken (race condition protection)
    existing_email = user_by_email(db, email)
    
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if google_id is now taken (race condition protection)
    existing_google = db.query(models.User).filter(
        models.User.google_id == google_id
    ).first()
    
    if existing_google:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account already linked"
        )
    
    # Hash password
    hashed_password = hashing.get_password_hash(request.password)
    
    # Create new user
    new_user = models.User(
        name=name,
        user_name=user_name,
        email=email,
        password=hashed_password,
        google_id=google_id,
        email_verified=True,  # Google verified the email
        meta_title=f"{name}'s Blog",
        meta_description=f"Explore all the blogs published by {name} on Articurls.",
        profile_image_url=picture or settings.default_profile_image_url,
    )
    
    db.add(new_user)
    db.flush()
    
    # Claim username
    claim_username_or_raise(db, new_user.user_id, user_name)
    
    # Add username audit entry
    db.add(
        models.UsernameChangeAudit(
            user_id=new_user.user_id,
            old_username=user_name,
            new_username=user_name,
            actor_user_id=new_user.user_id,
            actor_email=email,
            is_admin_override=False,
            reason="account_created_via_google",
            request_ip=None,
            user_agent=None,
        )
    )
    
    db.commit()
    db.refresh(new_user)
    
    # Issue tokens
    access_token = oauth2.create_access_token(
        data={"sub": new_user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    refresh_token = oauth2.create_refresh_token(new_user.email)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


async def _login_existing_user(
    user: models.User,
    response: Response,
    db: Session,
) -> RedirectResponse:
    """
    Helper function to log in an existing user and redirect to dashboard.
    
    Args:
        user: User model instance
        response: FastAPI response object
        db: Database session
        
    Returns:
        RedirectResponse: Redirect to dashboard with tokens
    """
    # Issue tokens
    access_token = oauth2.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    refresh_token = oauth2.create_refresh_token(user.email)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60
    )
    
    # Redirect to dashboard with access token in URL
    # Frontend will extract and store it
    dashboard_url = f"{settings.app_base_url}/dashboard?access_token={access_token}"
    return RedirectResponse(url=dashboard_url, status_code=status.HTTP_302_FOUND)
