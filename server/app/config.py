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

    # Resend (email-уведомления о заявках). Без RESEND_API_KEY письма не шлются —
    # заявка всё равно сохраняется в БД, ответ пользователю остаётся успешным.
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = ""
    RESEND_TO: str = ""

    # Tawk.to: адрес «Ticket forwarding email» (Administration → Overview).
    # Каждая заявка уходит письмом → появляется отдельный тикет в Inbox Tawk.
    TAWK_TICKET_FORWARD_EMAIL: str = ""

    # Tawk JavaScript API key (Administration → Overview → JavaScript API → Key).
    # Нужен для login() с hash — телефон попадает в поле Contact (E.164).
    TAWK_JS_API_KEY: str = ""

    # Cloudflare Turnstile (на Host localhost/127.0.0.1 проверка отключена; пустой secret + DEBUG=true — тоже пропуск)
    TURNSTILE_SECRET_KEY: str = ""
    TURNSTILE_SITE_KEY: str = ""

    # Policy version for consents
    POLICY_VERSION: str = "2026-01-01"


settings = Settings()
