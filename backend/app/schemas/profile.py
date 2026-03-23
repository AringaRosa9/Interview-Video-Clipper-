from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProfileCreate(BaseModel):
    name: str
    base_url: str
    api_key: str
    model: str
    is_default: bool = False


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    is_default: Optional[bool] = None


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    base_url: str
    model: str
    is_default: bool
    created_at: str
