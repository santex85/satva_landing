from pydantic import BaseModel, EmailStr

from app.schemas.public_forms import ContactRequest

__all__ = ["ContactRequest", "ContactResponse", "TawkLoginPayload"]


class TawkLoginPayload(BaseModel):
    userId: str
    hash: str
    name: str | None = None
    email: EmailStr | None = None
    phone: str


class ContactResponse(BaseModel):
    ok: bool = True
    message: str = "Заявка принята. Мы свяжемся с вами в ближайшее время."
    tawk_login: TawkLoginPayload | None = None
