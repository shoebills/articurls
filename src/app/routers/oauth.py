"""
Google OAuth router for backend-controlled OAuth flow.

Endpoints:
- GET /auth/google/login - Initiate OAuth flow
- GET /auth/google/callback - Handle OAuth callback
- POST /auth/google/complete - Complete onboarding for new users
- POST /auth/exchange-token - Exchange one-time code for access token
"""

import secrets
from fastapi import APIRouter, HTTPException, Request, status, Response, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from ..database import get_db
from ..config import settings
from ..schemas.oauth import GoogleUserInfo, GoogleOAuthSession, CompleteGoogleSignup
from ..schemas.token import Token
from ..security import oauth2, hashing
from ..redis_client import redis_client
from ..utils.rate_limit import check_rate_limit_ip
from ..utils.google_oauth import (
    get_authorization_url,
    validate_state_token,
    exchange_code_for_token,
    get_google_user_info,
    store_oauth_session,
    get_oauth_session,
    delete_oauth_session,
    generate_session_id,
)
from ..utils import (
    is_admin_email,
    user_by_email,
    normalize_email,
    validate_subdomain_or_raise,
)
from .. import models
from ..storage.service import fetch_remote_image, save_media_bytes


class ExchangeTokenRequest(BaseModel):
    code: str


_OAUTH_EXCHANGE_TTL = 30  # seconds — code is single-use and short-lived

_OAUTH_LOGIN_IP_LIMIT = 15
_OAUTH_LOGIN_IP_WINDOW = 300
_OAUTH_LOGIN_IP_BURST = 5

_OAUTH_COMPLETE_IP_LIMIT = 10
_OAUTH_COMPLETE_IP_WINDOW = 600
_OAUTH_COMPLETE_IP_BURST = 5

_OAUTH_EXCHANGE_IP_LIMIT = 20
_OAUTH_EXCHANGE_IP_WINDOW = 60
_OAUTH_EXCHANGE_IP_BURST = 10


router = APIRouter(
    prefix="/auth/google",
    tags=["OAuth"]
)


@router.get("/login")
async def google_login(request: Request):
    """
    Initiate Google OAuth flow.
    
    Generates a secure state token and redirects to Google's OAuth consent screen.
    
    Returns:
        RedirectResponse: Redirect to Google OAuth authorization URL
    """
    check_rate_limit_ip(
        request,
        "oauth-login",
        _OAUTH_LOGIN_IP_LIMIT,
        _OAUTH_LOGIN_IP_WINDOW,
        burst=_OAUTH_LOGIN_IP_BURST,
    )

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
    request: Request,
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
    check_rate_limit_ip(
        request,
        "oauth-callback",
        _OAUTH_LOGIN_IP_LIMIT,
        _OAUTH_LOGIN_IP_WINDOW,
        burst=_OAUTH_LOGIN_IP_BURST,
    )

    # Handle OAuth errors
    if error:
        error_url = f"{settings.app_base_url}/login?error=oauth_failed"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
    
    # Validate required parameters
    if not code or not state:
        error_url = f"{settings.app_base_url}/login?error=invalid_request"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
    
    state_valid, code_verifier = validate_state_token(state)
    if not state_valid:
        error_url = f"{settings.app_base_url}/login?error=invalid_state"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
    
    try:
        token_response = await exchange_code_for_token(code, settings.google_redirect_uri, code_verifier)
        access_token = token_response.get("access_token")
        
        if not access_token:
            print(f"OAuth token exchange failed. Response: {token_response}")
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
                existing_user_by_email.email_verified = True
                
                # Update account profile picture if not set
                if picture and not existing_user_by_email.profile_image_url:
                    remote_img = await fetch_remote_image(picture)
                    if remote_img:
                        img_bytes, ct = remote_img
                        user_stored = save_media_bytes(
                            img_bytes,
                            category="avatar",
                            content_type=ct,
                            user_id=existing_user_by_email.user_id,
                        )
                        existing_user_by_email.profile_image_url = user_stored.url
                    else:
                        existing_user_by_email.profile_image_url = picture
                
                db.commit()
                db.refresh(existing_user_by_email)
            elif not existing_user_by_email.email_verified:
                existing_user_by_email.email_verified = True
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
        
        # Redirect to setup page with email and name in URL for display
        from urllib.parse import quote
        setup_url = (
            f"{settings.app_base_url}/setup?"
            f"session_id={session_id}&"
            f"email={quote(email)}&"
            f"name={quote(name)}"
        )
        return RedirectResponse(url=setup_url, status_code=status.HTTP_302_FOUND)
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error in production with more details
        import traceback
        print(f"OAuth callback error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        error_url = f"{settings.app_base_url}/login?error=oauth_failed"
        return RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)


@router.post("/complete", response_model=Token)
async def complete_google_signup(
    request: CompleteGoogleSignup,
    req: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Complete Google OAuth signup by creating user account.
    
    This endpoint is called after the user completes the onboarding form
    with their desired subdomain, blog name, and template.
    
    Args:
        request: Onboarding completion data (session_id, subdomain, name, ...)
        response: FastAPI response object
        db: Database session
        
    Returns:
        Token: Access token and token type
        
    Raises:
        HTTPException: If session invalid, subdomain taken, or creation fails
    """
    check_rate_limit_ip(
        req,
        "oauth-complete",
        _OAUTH_COMPLETE_IP_LIMIT,
        _OAUTH_COMPLETE_IP_WINDOW,
        burst=_OAUTH_COMPLETE_IP_BURST,
    )

    # Peek (do not consume) the OAuth session so a retry after a partial
    # failure — or a duplicate form submission — can still resolve the user.
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

    # Idempotency: a duplicate submit (double-click) or a retry after the first
    # request already created the account must log in instead of erroring out.
    existing_google = db.query(models.User).filter(
        models.User.google_id == google_id
    ).first()
    if existing_google:
        delete_oauth_session(request.session_id)
        access_token = oauth2.create_access_token(
            data={"sub": existing_google.email, "ver": existing_google.token_version},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )
        refresh_token = oauth2.create_refresh_token(existing_google.email)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
            max_age=settings.refresh_token_expire_days * 24 * 60 * 60
        )
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    # Use the name from the request (user may have edited it)
    name = request.name

    # Validate subdomain
    subdomain = validate_subdomain_or_raise(
        request.subdomain, allow_reserved=is_admin_email(email)
    )

    # Check if email is now taken (race condition protection)
    existing_email = user_by_email(db, email)

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if subdomain is taken
    existing_subdomain = db.query(models.Site).filter(
        models.Site.subdomain == subdomain
    ).first()

    if existing_subdomain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain already taken"
        )

    # Create new user (passwordless Google account)
    new_user = models.User(
        name=name,
        email=email,
        password=None,
        google_id=google_id,
        email_verified=True,  # Google verified the email
    )

    db.add(new_user)
    db.flush()

    # Create default Site
    new_site = models.Site(
        user_id=new_user.user_id,
        subdomain=subdomain,
        meta_title=f"{name}'s Blog",
        meta_description=f"Explore all the blogs published by {name}.",
        site_name=(request.site_name or "").strip() or None,
        timezone=request.timezone,
    )
    if request.template_id in ("standard",):
        new_site.template_id = request.template_id
    db.add(new_site)
    db.flush()

    # Create default Author
    new_author = models.Author(
        site_id=new_site.site_id,
        name=name,
        slug=subdomain,
    )
    db.add(new_author)
    db.flush()

    # Best-effort profile picture sync — never let a remote fetch or storage
    # failure break account creation.
    if picture:
        try:
            remote_img = await fetch_remote_image(picture)
            if remote_img:
                img_bytes, ct = remote_img
                user_stored = save_media_bytes(
                    img_bytes,
                    category="avatar",
                    content_type=ct,
                    user_id=new_user.user_id,
                )
                new_user.profile_image_url = user_stored.url

                author_stored = save_media_bytes(
                    img_bytes,
                    category="authors",
                    content_type=ct,
                    site_id=new_site.site_id,
                    entity_id=new_author.author_id,
                )
                new_author.profile_image_url = author_stored.url
            else:
                new_user.profile_image_url = picture
                new_author.profile_image_url = picture
        except Exception as e:
            print(f"[oauth] profile picture sync failed: {e}")
            new_user.profile_image_url = picture
            new_author.profile_image_url = picture or settings.default_profile_image_url
    elif settings.default_profile_image_url:
        new_author.profile_image_url = settings.default_profile_image_url

    db.commit()
    db.refresh(new_user)

    # Consume the session only once the account has been fully created.
    delete_oauth_session(request.session_id)

    from ..umami.service import enqueue_umami_provision

    enqueue_umami_provision(new_user.user_id)

    # Issue tokens
    access_token = oauth2.create_access_token(
        data={"sub": new_user.email, "ver": new_user.token_version},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )

    refresh_token = oauth2.create_refresh_token(new_user.email)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
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
    access_token = oauth2.create_access_token(
        data={"sub": user.email, "ver": user.token_version},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    refresh_token = oauth2.create_refresh_token(user.email)

    code = secrets.token_urlsafe(32)
    redis_client.setex(f"oauth_exchange:{code}", _OAUTH_EXCHANGE_TTL, access_token)

    dashboard_url = f"{settings.app_base_url}/dashboard?code={code}"
    redirect = RedirectResponse(url=dashboard_url, status_code=status.HTTP_302_FOUND)
    
    # Set the refresh_token cookie on the actual RedirectResponse that is
    # returned to the browser.  Previously the cookie was set on the DI
    # `response` object which is *not* the response sent back when we
    # return a RedirectResponse — so the cookie was silently discarded.
    redirect.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60
    )
    
    return redirect


@router.post("/exchange-token", response_model=Token)
def exchange_token(request: ExchangeTokenRequest, req: Request):
    check_rate_limit_ip(
        req,
        "oauth-exchange",
        _OAUTH_EXCHANGE_IP_LIMIT,
        _OAUTH_EXCHANGE_IP_WINDOW,
        burst=_OAUTH_EXCHANGE_IP_BURST,
    )
    redis_key = f"oauth_exchange:{request.code}"
    access_token = redis_client.get(redis_key)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )
    redis_client.delete(redis_key)
    return {"access_token": access_token, "token_type": "bearer"}
