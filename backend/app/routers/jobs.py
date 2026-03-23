import sqlite3
import shutil
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.models.job import Job
from app.schemas.job import HighlightItemRead, JobCreate, JobHighlightsRead, JobRead
from app.services import media_service, transcription_service
from app.services.highlight_selector import parse_highlight_response
from app.services.workspace_service import allocate_job_workspace

router = APIRouter(prefix="/jobs", tags=["jobs"])

QUEUED_STATUS = "queued"
DOWNLOADING_STATUS = "downloading"
TRANSCRIBING_STATUS = "transcribing"


def _row_to_job(row: sqlite3.Row) -> Job:
    return Job(
        id=row["id"],
        video_url=row["video_url"],
        candidate_name=row["candidate_name"],
        profile_id=row["profile_id"],
        target_duration_seconds=row["target_duration_seconds"],
        status=row["status"],
        workspace_path=row["workspace_path"],
        failure_message=row["failure_message"],
        created_at=row["created_at"],
    )


def _get_job_row(
    connection: sqlite3.Connection, job_id: int
) -> Optional[sqlite3.Row]:
    return connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()


def _update_job_status(
    connection: sqlite3.Connection, job_id: int, status_value: str
) -> None:
    connection.execute(
        "UPDATE jobs SET status = ?, failure_message = NULL WHERE id = ?",
        (status_value, job_id),
    )


def _persist_workspace_value(workspace_path: str, file_name: str, value: str) -> None:
    Path(workspace_path, file_name).write_text(value, encoding="utf-8")


def _cleanup_workspace(workspace_path: Optional[str]) -> None:
    if not workspace_path:
        return
    shutil.rmtree(workspace_path, ignore_errors=True)


def _read_workspace_highlights(workspace_path: Optional[str]) -> list[HighlightItemRead]:
    if not workspace_path:
        return []
    highlight_path = Path(workspace_path) / "highlights.json"
    if not highlight_path.exists():
        return []
    payload = json.loads(highlight_path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        return parse_highlight_response(payload)
    return [HighlightItemRead.model_validate(item) for item in payload]


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job_endpoint(
    payload: JobCreate, connection: sqlite3.Connection = Depends(get_db)
) -> JobRead:
    profile_exists = connection.execute(
        "SELECT 1 FROM profiles WHERE id = ?",
        (payload.profile_id,),
    ).fetchone()
    if profile_exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    workspace_path: Optional[str] = None

    try:
        cursor = connection.execute(
            """
            INSERT INTO jobs (
                video_url,
                candidate_name,
                profile_id,
                target_duration_seconds,
                status,
                workspace_path,
                failure_message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(payload.video_url),
                payload.candidate_name,
                payload.profile_id,
                payload.target_duration_seconds,
                QUEUED_STATUS,
                "",
                None,
            ),
        )
        job_id = cursor.lastrowid
        workspace_path = str(allocate_job_workspace(job_id))
        connection.execute(
            "UPDATE jobs SET workspace_path = ? WHERE id = ?",
            (workspace_path, job_id),
        )
        _update_job_status(connection, job_id, DOWNLOADING_STATUS)
        video_path = media_service.download_video(str(payload.video_url), workspace_path)
        _persist_workspace_value(workspace_path, "video_path.txt", video_path)
        audio_path = media_service.extract_audio(video_path, workspace_path)
        _persist_workspace_value(workspace_path, "audio_path.txt", audio_path)
        _update_job_status(connection, job_id, TRANSCRIBING_STATUS)
        transcription_service.transcribe_audio(audio_path, workspace_path)
    except Exception:
        connection.rollback()
        _cleanup_workspace(workspace_path)
        raise
    row = _get_job_row(connection, job_id)
    return JobRead.model_validate(_row_to_job(row))


@router.get("/{job_id}", response_model=JobRead)
def get_job_endpoint(
    job_id: int, connection: sqlite3.Connection = Depends(get_db)
) -> JobRead:
    row = _get_job_row(connection, job_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobRead.model_validate(_row_to_job(row))


@router.get("/{job_id}/highlights", response_model=JobHighlightsRead)
def get_job_highlights_endpoint(
    job_id: int, connection: sqlite3.Connection = Depends(get_db)
) -> JobHighlightsRead:
    row = _get_job_row(connection, job_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobHighlightsRead(
        job_id=job_id,
        status=row["status"],
        items=_read_workspace_highlights(row["workspace_path"]),
    )
