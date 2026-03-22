from pydantic_settings import BaseSettings


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

    class Config:
        env_file = ".env"

settings = Settings()