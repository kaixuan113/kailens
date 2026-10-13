from typing import List, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    password: str = Field(..., min_length=6, max_length=200)


class PasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=10, max_length=200)


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


class PostPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    slug: str = Field(..., regex=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=160)
    excerpt: str = Field(..., max_length=500)
    content: str = Field(..., min_length=1)
    cover_url: str = Field("", max_length=1000)
    tags: List[str] = Field(default_factory=list)
    status: str = Field("draft", regex=r"^(draft|published)$")
    published_at: Optional[str] = None


class SkillPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str = Field(..., max_length=300)
    instructions: str = Field(..., min_length=1, max_length=10000)
    enabled: bool = True


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    skill_id: Optional[int] = None
