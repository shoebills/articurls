import base64
import hashlib
import json
import secrets
from typing import Dict, Any
from authlib.integrations.starlette_client import OAuth
from ..config import settings
from ..redis_client import redis_client


# Initialize OAuth client
oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
    },
)


def generate_state_token() -> str:
    """
    Generate a secure random state token for CSRF protection.
    
    Returns:
        str: A cryptographically secure random token
    """
    return secrets.token_urlsafe(32)


def store_state_token(state: str, ttl: int = 1800, code_verifier: str | None = None) -> None:
    """
    Store state token in Redis with TTL for validation.

    Args:
        state: The state token to store
        ttl: Time to live in seconds (default: 30 minutes)
        code_verifier: Optional PKCE code verifier to store alongside the state
    """
    value = json.dumps({"valid": True, "code_verifier": code_verifier})
    try:
        redis_client.set(f"oauth_state:{state}", value, ex=ttl)
    except Exception as e:
        print(f"[OAuth] Redis error during state storage: {e}")
        import traceback
        print(f"[OAuth] Traceback: {traceback.format_exc()}")
        raise


def validate_state_token(state: str) -> tuple[bool, str | None]:
    """
    Validate state token from Redis and return the stored code verifier.

    Args:
        state: The state token to validate

    Returns:
        tuple: (is_valid, code_verifier_or_none)
    """
    key = f"oauth_state:{state}"
    try:
        raw = redis_client.get(key)
        if raw is None:
            return False, None
        data = json.loads(raw)
        return True, data.get("code_verifier")
    except Exception as e:
        print(f"[OAuth] Redis error during state validation: {e}")
        import traceback
        print(f"[OAuth] Traceback: {traceback.format_exc()}")
        return False, None


def generate_code_verifier() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()


def compute_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def get_authorization_url(redirect_uri: str) -> tuple[str, str]:
    """
    Generate Google OAuth authorization URL with state token and PKCE.

    Args:
        redirect_uri: The callback URL for OAuth redirect

    Returns:
        tuple: (authorization_url, state_token)
    """
    state = generate_state_token()
    code_verifier = generate_code_verifier()
    code_challenge = compute_code_challenge(code_verifier)
    store_state_token(state, code_verifier=code_verifier)

    from urllib.parse import quote

    authorization_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.google_client_id}&"
        f"redirect_uri={quote(redirect_uri, safe='')}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"state={state}&"
        f"code_challenge={code_challenge}&"
        f"code_challenge_method=S256&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    return authorization_url, state


async def exchange_code_for_token(code: str, redirect_uri: str, code_verifier: str | None = None) -> Dict[str, Any]:
    """
    Exchange authorization code for access token.

    Args:
        code: Authorization code from Google
        redirect_uri: The same redirect URI used in authorization
        code_verifier: Optional PKCE code verifier

    Returns:
        dict: Token response from Google

    Raises:
        Exception: If token exchange fails
    """
    import httpx

    token_url = "https://oauth2.googleapis.com/token"

    data: dict[str, str] = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    if code_verifier:
        data["code_verifier"] = code_verifier

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"Token exchange failed. Status: {e.response.status_code}")
            print(f"Response: {e.response.text}")
            print(f"Redirect URI used: {redirect_uri}")
            raise


async def get_google_user_info(access_token: str) -> Dict[str, Any]:
    """
    Retrieve user information from Google using access token.
    
    Args:
        access_token: Google access token
        
    Returns:
        dict: User information from Google
        
    Raises:
        Exception: If user info retrieval fails
    """
    import httpx
    
    userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(userinfo_url, headers=headers)
        response.raise_for_status()
        return response.json()


def store_oauth_session(session_id: str, data: Dict[str, Any], ttl: int = 900) -> None:
    """
    Store temporary OAuth session data in Redis.
    
    Args:
        session_id: Unique session identifier
        data: Session data to store (will be JSON serialized)
        ttl: Time to live in seconds (default: 15 minutes)
    """
    import json
    try:
        redis_client.set(f"oauth_session:{session_id}", json.dumps(data), ex=ttl)
    except Exception as e:
        print(f"[OAuth] Redis error during session storage: {e}")
        import traceback
        print(f"[OAuth] Traceback: {traceback.format_exc()}")
        raise


def get_oauth_session(session_id: str) -> Dict[str, Any] | None:
    """
    Retrieve and consume OAuth session data from Redis.
    
    Args:
        session_id: Session identifier
        
    Returns:
        dict | None: Session data if found, None otherwise
    """
    import json
    key = f"oauth_session:{session_id}"
    
    try:
        data = redis_client.get(key)
        
        if data:
            # Consume the session (delete it)
            redis_client.delete(key)
            return json.loads(data)
        else:
            return None
    except Exception as e:
        print(f"[OAuth] Redis error during session retrieval: {e}")
        import traceback
        print(f"[OAuth] Traceback: {traceback.format_exc()}")
        return None


def generate_session_id() -> str:
    """
    Generate a unique session ID for OAuth flow.
    
    Returns:
        str: A cryptographically secure random session ID
    """
    return secrets.token_urlsafe(32)
