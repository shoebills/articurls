from pydantic import BaseModel, EmailStr, Field, field_validator

from ..utils.timezones import normalize_timezone


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
    subdomain: str
    name: str  # Allow user to edit the name from Google
    site_name: str | None = None
    template_id: str | None = "standard"
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def _valid_timezone(cls, v: str | None) -> str | None:
        normalized = normalize_timezone(v)
        if v and normalized is None:
            raise ValueError("Invalid IANA timezone")
        return normalized
