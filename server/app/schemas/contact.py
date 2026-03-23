from pydantic import BaseModel, Field, field_validator
import re


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=10, max_length=20)
    consent: bool = Field(..., description="Must be true")
    website: str | None = Field(None, description="Honeypot - must be empty")

    @field_validator("name")
    @classmethod
    def name_letters_only(cls, v: str) -> str:
        if not re.match(r"^[а-яА-ЯёЁa-zA-Z\s\-]+$", v.strip()):
            raise ValueError("Имя может содержать только буквы")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10:
            raise ValueError("Телефон должен содержать минимум 10 цифр")
        if len(digits) > 15:
            raise ValueError("Телефон слишком длинный")
        if digits.startswith("66") and len(digits) == 11 and not re.match(r"^66[689]\d{8}$", digits):
            raise ValueError("Введите корректный тайский номер (+66, затем 9 цифр, начиная с 6, 8 или 9)")
        return v.strip()

    @field_validator("consent")
    @classmethod
    def consent_required(cls, v: bool) -> bool:
        if v is not True:
            raise ValueError("Необходимо согласие с политикой конфиденциальности")
        return v


class ContactResponse(BaseModel):
    ok: bool = True
    message: str = "Заявка принята. Мы свяжемся с вами в ближайшее время."
