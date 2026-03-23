from pathlib import Path

from app.db import database_path


def jobs_root() -> Path:
    db_path = database_path()
    if db_path.parent.name == "data":
        return db_path.parent / "jobs"
    return db_path.parent / "data" / "jobs"


def allocate_job_workspace(job_id: int) -> Path:
    workspace = jobs_root() / str(job_id)
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace
