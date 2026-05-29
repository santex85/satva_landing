from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import AdminAuditLog, AdminUser


def log_audit(
    db: Session,
    *,
    actor: AdminUser | None,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    entry = AdminAuditLog(
        actor_id=actor.id if actor else None,
        action=action,
        target_type=target_type,
        target_id=target_id,
        meta=meta,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.flush()
