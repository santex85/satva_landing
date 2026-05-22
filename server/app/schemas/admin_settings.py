from pydantic import BaseModel, EmailStr, Field


class AdminSettingsOut(BaseModel):
    lead_notification_emails: list[EmailStr]


class AdminSettingsUpdate(BaseModel):
    lead_notification_emails: list[EmailStr] = Field(min_length=1)
