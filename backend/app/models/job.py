from dataclasses import dataclass
from typing import Optional


@dataclass
class Job:
    id: int
    video_url: str
    candidate_name: str
    profile_id: int
    target_duration_seconds: int
    status: str
    workspace_path: str
    failure_message: Optional[str]
    created_at: str
