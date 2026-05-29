from pydantic import BaseModel, Field


class UmamiSettingsOut(BaseModel):
    website_id: str = ""
    api_base: str = "https://api.umami.is/v1"
    api_key_set: bool = False
    api_key_hint: str = ""
    configured: bool = False


class UmamiSettingsUpdate(BaseModel):
    website_id: str = Field(..., min_length=1, max_length=128)
    api_base: str = Field(default="https://api.umami.is/v1", min_length=8, max_length=255)
    api_key: str | None = Field(default=None, max_length=512)


class UmamiSettingsTest(BaseModel):
    website_id: str = Field(..., min_length=1, max_length=128)
    api_base: str = Field(default="https://api.umami.is/v1", min_length=8, max_length=255)
    api_key: str | None = Field(default=None, max_length=512)


class UmamiSettingsTestOut(BaseModel):
    ok: bool
    message: str
    visitors: int | None = None
