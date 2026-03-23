from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/satva"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    CORS_ORIGINS: str = "http://localhost,http://127.0.0.1"

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_TO: str = ""

    # amoCRM
    AMOCRM_SUBDOMAIN: str = ""
    AMOCRM_CLIENT_ID: str = ""
    AMOCRM_CLIENT_SECRET: str = ""
    AMOCRM_ACCESS_TOKEN: str = ""
    AMOCRM_REFRESH_TOKEN: str = ""

    # Policy version for consents
    POLICY_VERSION: str = "2026-01-01"


settings = Settings()
