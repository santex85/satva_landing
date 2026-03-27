from pydantic import BaseModel

from app.schemas.public_forms import ContactRequest

__all__ = ["ContactRequest", "ContactResponse"]


class ContactResponse(BaseModel):
    ok: bool = True
    message: str = "Заявка принята. Мы свяжемся с вами в ближайшее время."
