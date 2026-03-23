from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.config import settings

router = APIRouter()


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db_ok = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = "error"

    return {
        "status": "ok" if db_ok == "ok" else "degraded",
        "db": db_ok,
        "version": settings.APP_VERSION,
    }
