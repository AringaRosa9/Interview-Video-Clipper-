from pathlib import Path

from app.core.config import get_settings


def _database_path() -> Path:
    database_url = get_settings().database_url
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        raise ValueError("Only sqlite:/// database URLs are supported")
    return Path(database_url.removeprefix(prefix))


def jobs_root() -> Path:
    database_path = _database_path()
    if database_path.parent.name == "data":
        return database_path.parent / "jobs"
    return database_path.parent / "data" / "jobs"


def allocate_job_workspace(job_id: int) -> Path:
    workspace = jobs_root() / str(job_id)
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace
