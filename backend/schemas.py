from typing import List, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    password: str = Field(..., min_length=6, max_length=200)


class PasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=10, max_length=200)


class PortfolioSettingsPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    subtitle: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=80)
    description: str = Field(..., min_length=1, max_length=500)
    contact: str = Field("", max_length=200)
    featured_work_id: Optional[int] = None


class WorkPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    category: str = Field("摄影", max_length=40)
    location: str = Field("", max_length=80)
    year: str = Field("", max_length=12)
    image_url: str = Field(..., min_length=1, max_length=1000)
    gallery_urls: List[str] = Field(default_factory=list, max_items=100)
    description: str = Field("", max_length=1000)
    featured: bool = False
    sort_order: int = 0
