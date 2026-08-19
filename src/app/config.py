from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    database_hostname: str
    database_port: str
    database_password: str
    database_name: str
    database_username: str
    database_sslmode: Optional[str] = None

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int = 7

    redis_url: str

    email_provider: str = "resend"
    smtp_host: str = ""
    smtp_port: int = 587
    resend_api_key: str = ""
    from_email: str = ""
    support_email: str = "support@articurls.com"

    dodopayments_api_key: str
    dodopayments_webhook_key: str
    dodopayments_environment: str
    dodopayments_product_id: str
    dodopayments_lifetime_product_id: str

    uploads_dir: str = "uploads"
    # Reader/marketing site origin (blog links in emails; env: MARKETING_ORIGIN).
    marketing_origin: str = "http://localhost:3000"
    # UGC (user-generated content) origin — where user blogs live (e.g. https://articurls.site).
    ugc_origin: str = "http://localhost:3000"
    public_base_url: str
    storage_backend: str = "local"
    r2_account_id: Optional[str] = None
    r2_bucket_name: Optional[str] = None
    r2_access_key_id: Optional[str] = None
    r2_secret_access_key: Optional[str] = None
    r2_public_base_url: Optional[str] = None
    default_profile_image_url: str

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    app_base_url: str = "http://localhost:3000"

    @property
    def ugc_domain(self) -> str:
        parsed = urlparse(self.ugc_origin)
        return parsed.hostname or ""

    admin_emails: str = ""
    
    internal_api_secret: str = ""

    vercel_api_token: str = ""
    vercel_project_name: str = ""
    vercel_team_id: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    cloudflare_client_id: str = ""
    cloudflare_client_secret: str = ""
    cloudflare_redirect_uri: str = ""

    umami_api_url: str = ""
    umami_api_username: str = ""
    umami_api_password: str = ""

    # Database connection pool settings.
    # Tune these based on server RAM and PostgreSQL max_connections.
    # 2GB droplet (testing):  pool_size=5,  max_overflow=5
    # 8GB droplet (prod):     pool_size=10, max_overflow=20
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()