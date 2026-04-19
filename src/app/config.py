from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    database_hostname: str
    database_port: str
    database_password: str
    database_name: str
    database_username: str

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    redis_url: str

    email_provider: str
    smtp_host: str
    smtp_port: int
    resend_api_key: str
    from_email: str

    dodopayments_api_key: str
    dodopayments_webhook_key: str
    dodopayments_environment: str
    dodopayments_product_id: str

    uploads_dir: str = "uploads"
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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()