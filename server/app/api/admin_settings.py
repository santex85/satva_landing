from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models import AdminUser, AdminRole
from app.schemas.admin_settings import AdminSettingsOut, AdminSettingsUpdate
from app.services.app_settings import (
    ensure_lead_notification_emails_initialized,
    get_lead_notification_emails,
    set_lead_notification_emails,
)
from app.services.audit import log_audit

router = APIRouter()


@router.get("/admin/settings", response_model=AdminSettingsOut)
def get_admin_settings(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    emails = ensure_lead_notification_emails_initialized(db)
    if not emails:
        emails = get_lead_notification_emails(db)
    return AdminSettingsOut(lead_notification_emails=emails)


@router.put("/admin/settings", response_model=AdminSettingsOut)
def update_admin_settings(
    body: AdminSettingsUpdate,
    db: Session = Depends(get_db),
    user: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    try:
        emails = set_lead_notification_emails(db, [str(email) for email in body.lead_notification_emails])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    log_audit(
        db,
        actor=user,
        action="settings.update",
        target_type="settings",
        target_id="lead_notification_emails",
        meta={"count": len(emails), "emails": emails},
    )
    db.commit()
    return AdminSettingsOut(lead_notification_emails=emails)
