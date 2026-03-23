from typing import Optional

from pydantic import BaseModel, ConfigDict


class JobCreate(BaseModel):
    video_url: str
    candidate_name: str
    profile_id: int
    target_duration_seconds: int


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    video_url: str
    candidate_name: str
    profile_id: int
    target_duration_seconds: int
    status: str
    workspace_path: str
    failure_message: Optional[str]
    created_at: str


class JobHighlightsRead(BaseModel):
    job_id: int
    status: str
    items: list[dict]
