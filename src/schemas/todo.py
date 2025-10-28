from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from schemas.tag import TagResponse


class TodoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str = Field(..., description="TODO内容")
    completed: bool = False
    deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []


class TodoCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500, description="TODO内容")
    deadline: Optional[datetime] = None
    tag_ids: list[int] = []


class TodoUpdate(BaseModel):
    content: Optional[str] = Field(
        None, min_length=1, max_length=500, description="TODO内容"
    )
    completed: Optional[bool] = None
    deadline: Optional[datetime] = None
    tag_ids: Optional[list[int]] = None
