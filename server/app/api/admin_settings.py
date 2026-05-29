from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models import AdminUser, AdminRole
from app.schemas.admin_settings import AdminSettingsOut, AdminSettingsUpdate
from app.schemas.umami_settings import (
    UmamiSettingsOut,
    UmamiSettingsTest,
    UmamiSettingsTestOut,
    UmamiSettingsUpdate,
)
from app.services.app_settings import (
    ensure_lead_notification_emails_initialized,
    ensure_umami_settings_initialized,
    get_lead_notification_emails,
    get_umami_settings_public,
    get_umami_settings_raw,
    set_lead_notification_emails,
    set_umami_settings,
)
from app.services.audit import log_audit
from app.services.umami import test_umami_connection

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


@router.get("/admin/settings/umami", response_model=UmamiSettingsOut)
def get_umami_admin_settings(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    return UmamiSettingsOut(**ensure_umami_settings_initialized(db))


@router.put("/admin/settings/umami", response_model=UmamiSettingsOut)
def update_umami_admin_settings(
    body: UmamiSettingsUpdate,
    db: Session = Depends(get_db),
    user: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    try:
        saved = set_umami_settings(
            db,
            website_id=body.website_id,
            api_base=body.api_base,
            api_key=body.api_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    log_audit(
        db,
        actor=user,
        action="settings.umami_update",
        target_type="settings",
        target_id="umami",
        meta={
            "website_id": saved["website_id"],
            "api_base": saved["api_base"],
            "api_key_set": saved["api_key_set"],
            "configured": saved["configured"],
        },
    )
    db.commit()
    return UmamiSettingsOut(**saved)


@router.post("/admin/settings/umami/test", response_model=UmamiSettingsTestOut)
def test_umami_admin_settings(
    body: UmamiSettingsTest,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    credentials = get_umami_settings_raw(db)
    api_key = credentials["api_key"]
    if body.api_key is not None and body.api_key.strip():
        api_key = body.api_key.strip()

    credentials = {
        "api_key": api_key,
        "website_id": body.website_id.strip(),
        "api_base": body.api_base.strip(),
    }
    ok, message, visitors = test_umami_connection(credentials)
    return UmamiSettingsTestOut(ok=ok, message=message, visitors=visitors)
