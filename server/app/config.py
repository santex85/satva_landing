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

    # SMTP (см. server/.env.example и DEPLOY.md)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_TO: str = ""
    # Порт 465 даёт implicit TLS автоматически; для нестандартных хостов можно включить явно
    SMTP_USE_SSL: bool = False

    # Cloudflare Turnstile (на Host localhost/127.0.0.1 проверка отключена; пустой secret + DEBUG=true — тоже пропуск)
    TURNSTILE_SECRET_KEY: str = ""
    TURNSTILE_SITE_KEY: str = ""

    # Policy version for consents
    POLICY_VERSION: str = "2026-01-01"


settings = Settings()
