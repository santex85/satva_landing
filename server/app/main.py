from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.core.logging_config import setup_logging
from app.core.middleware import RequestIdMiddleware
from app.api import (
    health,
    contact,
    auth,
    leads,
    public_config,
    booking,
    package_request,
    admin_settings,
    admin_analytics,
    admin_users,
    lead_notes,
    admin_audit,
)

setup_logging(debug=settings.DEBUG)

if not settings.DEBUG and settings.JWT_SECRET == "change-me-in-production":
    raise RuntimeError("JWT_SECRET must be set in production (not the default value)")

app = FastAPI(
    title="Satva Landing API",
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(public_config.router, prefix="/api", tags=["config"])
app.include_router(contact.router, prefix="/api", tags=["contact"])
app.include_router(booking.router, prefix="/api", tags=["booking"])
app.include_router(package_request.router, prefix="/api", tags=["package"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(admin_settings.router, prefix="/api", tags=["admin"])
app.include_router(admin_analytics.router, prefix="/api", tags=["admin"])
app.include_router(admin_users.router, prefix="/api", tags=["admin"])
app.include_router(admin_audit.router, prefix="/api", tags=["admin"])
app.include_router(lead_notes.router, prefix="/api", tags=["leads"])
app.include_router(leads.router, prefix="/api", tags=["leads"])
from app.core.rate_limit import limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.get("/")
def root():
    return {"status": "ok", "version": settings.APP_VERSION}
