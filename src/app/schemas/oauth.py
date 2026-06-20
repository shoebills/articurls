from pydantic import BaseModel, EmailStr, Field


class GoogleUserInfo(BaseModel):
    """Google user info returned from OAuth."""
    id: str  # Google user ID
    email: EmailStr
    verified_email: bool
    name: str
    given_name: str | None = None
    family_name: str | None = None
    picture: str | None = None


class GoogleOAuthSession(BaseModel):
    """Temporary session data stored in Redis during OAuth flow."""
    google_id: str
    email: str
    name: str
    picture: str | None = None
    email_verified: bool


class CompleteGoogleSignup(BaseModel):
    """Request body for completing Google OAuth signup."""
    session_id: str
    user_name: str
    password: str = Field(..., min_length=8)
    name: str  # Allow user to edit the name from Google
