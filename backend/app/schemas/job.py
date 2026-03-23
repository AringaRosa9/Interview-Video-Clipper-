from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class JobCreate(BaseModel):
    video_url: HttpUrl
    candidate_name: str
    profile_id: int
    target_duration_seconds: int = Field(gt=0)


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


class HighlightItemRead(BaseModel):
    start: float
    end: float
    star_label: str
    summary: str
    reason: str
    score: float


class JobHighlightsRead(BaseModel):
    job_id: int
    status: str
    items: list[HighlightItemRead]


class JobReviewRequest(BaseModel):
    approved_highlight_ids: list[int] = Field(default_factory=list)


class JobReviewRead(BaseModel):
    job_id: int
    status: str
    approved_highlight_ids: list[int]


class JobExportRead(BaseModel):
    job_id: int
    status: str
    output_file: str
