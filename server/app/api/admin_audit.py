from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_role
from app.core.database import get_db
from app.models import AdminAuditLog, AdminUser, AdminRole
from app.schemas.audit import AuditLogOut

router = APIRouter()


@router.get("/admin/audit", response_model=list[AuditLogOut])
def list_audit(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_role(AdminRole.OWNER)),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    rows = (
        db.query(AdminAuditLog)
        .options(joinedload(AdminAuditLog.actor))
        .order_by(AdminAuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    result = []
    for row in rows:
        result.append(
            AuditLogOut(
                id=row.id,
                action=row.action,
                target_type=row.target_type,
                target_id=row.target_id,
                meta=row.meta,
                created_at=row.created_at,
                actor_email=row.actor.email if row.actor else None,
            )
        )
    return result
