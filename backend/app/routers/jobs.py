import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobHighlightsRead, JobRead
from app.services.workspace_service import allocate_job_workspace

router = APIRouter(prefix="/jobs", tags=["jobs"])

QUEUED_STATUS = "queued"


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
    return JobHighlightsRead(job_id=job_id, status=row["status"], items=[])
