import base64
import sqlite3
import shutil
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import ValidationError

from app.db import get_db
from app.models.job import Job
from app.schemas.job import (
    HighlightItemRead,
    JobCreate,
    JobExportRead,
    JobHighlightsRead,
    JobRead,
    JobReviewRead,
    JobReviewRequest,
)
from app.services import export_service, filtering_service, media_service, transcription_service
from app.services import highlight_selector
from app.services.highlight_selector import parse_highlight_response
from app.services.workspace_service import allocate_job_workspace

router = APIRouter(prefix="/jobs", tags=["jobs"])

QUEUED_STATUS = "queued"
DOWNLOADING_STATUS = "downloading"
TRANSCRIBING_STATUS = "transcribing"
REVIEW_READY_STATUS = "review_ready"
REVIEWABLE_JOB_STATUSES = {REVIEW_READY_STATUS, "reviewed", "exported"}


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


def _highlights_path(workspace_path: str) -> Path:
    return Path(workspace_path) / "highlights.json"


def _read_workspace_highlights(workspace_path: Optional[str]) -> list[HighlightItemRead]:
    if not workspace_path:
        return []
    highlight_path = _highlights_path(workspace_path)
    if not highlight_path.exists():
        return []
    try:
        payload = json.loads(highlight_path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return parse_highlight_response(payload)
        return [HighlightItemRead.model_validate(item) for item in payload]
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError, ValidationError):
        return []


def _write_workspace_highlights(
    workspace_path: str, highlights: list[HighlightItemRead]
) -> None:
    _highlights_path(workspace_path).write_text(
        json.dumps(
            {"highlights": [highlight.model_dump() for highlight in highlights]},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def _approved_highlight_ids_path(workspace_path: str) -> Path:
    return Path(workspace_path) / "approved_highlight_ids.json"


def _read_workspace_approved_highlight_ids(workspace_path: Optional[str]) -> list[int]:
    if not workspace_path:
        return []
    approved_path = _approved_highlight_ids_path(workspace_path)
    if not approved_path.exists():
        return []
    try:
        payload = json.loads(approved_path.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            return []
        return [int(item) for item in payload]
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return []


def _write_workspace_approved_highlight_ids(
    workspace_path: str, approved_highlight_ids: list[int]
) -> None:
    _approved_highlight_ids_path(workspace_path).write_text(
        json.dumps(approved_highlight_ids, ensure_ascii=False),
        encoding="utf-8",
    )


def _output_file_path(workspace_path: str) -> Path:
    return Path(workspace_path) / "output_file.txt"


def _write_workspace_output_file(workspace_path: str, output_file: str) -> None:
    _output_file_path(workspace_path).write_text(output_file, encoding="utf-8")


def _read_workspace_output_file(workspace_path: Optional[str]) -> Optional[str]:
    if not workspace_path:
        return None
    output_path = _output_file_path(workspace_path)
    if output_path.exists():
        return output_path.read_text(encoding="utf-8").strip() or None
    fallback = Path(workspace_path) / "final.mp4"
    return str(fallback) if fallback.exists() else None


def _decode_api_key(api_key_obscured: str) -> str:
    return base64.urlsafe_b64decode(api_key_obscured.encode("ascii")).decode("utf-8")


def _build_fallback_highlights(
    segments: list[dict], target_duration_seconds: int
) -> list[HighlightItemRead]:
    remaining_duration = max(target_duration_seconds, 0)
    highlights: list[HighlightItemRead] = []

    for segment in segments:
        text = str(segment.get("text", "")).strip()
        if not text:
            continue
        start = float(segment.get("start", 0))
        end = float(segment.get("end", start))
        duration = max(end - start, 0.0)
        if duration <= 0:
            continue
        highlights.append(
            HighlightItemRead(
                start=start,
                end=end,
                star_label="Candidate Highlight",
                summary=text[:60],
                reason="基于候选人回答内容的本地回退高亮。",
                score=0.5,
            )
        )
        remaining_duration -= duration
        if remaining_duration <= 0:
            break

    return highlights


def _generate_highlights(
    connection: sqlite3.Connection,
    profile_id: int,
    target_duration_seconds: int,
    transcript_segments: list[dict],
) -> list[HighlightItemRead]:
    if not transcript_segments:
        return []

    filtered_segments = filtering_service.filter_candidate_segments(transcript_segments)
    if not filtered_segments:
        return []

    try:
        transcript_chunks = filtering_service.chunk_transcript_segments(filtered_segments)
        profile_row = connection.execute(
            "SELECT base_url, api_key_obscured, model FROM profiles WHERE id = ?",
            (profile_id,),
        ).fetchone()
        if profile_row is None or not transcript_chunks:
            return _build_fallback_highlights(filtered_segments, target_duration_seconds)

        selection_request = highlight_selector.HighlightSelectionRequest(
            base_url=profile_row["base_url"],
            api_key=_decode_api_key(profile_row["api_key_obscured"]),
            model=profile_row["model"],
            transcript_chunks=transcript_chunks,
            target_duration_seconds=target_duration_seconds,
        )
        highlights = highlight_selector.select_highlights(selection_request)
        return highlights or _build_fallback_highlights(
            filtered_segments, target_duration_seconds
        )
    except Exception:
        return _build_fallback_highlights(filtered_segments, target_duration_seconds)


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
        transcript_segments = transcription_service.transcribe_audio(audio_path, workspace_path)
        highlights = _generate_highlights(
            connection,
            payload.profile_id,
            payload.target_duration_seconds,
            transcript_segments,
        )
        _write_workspace_highlights(workspace_path, highlights)
        _update_job_status(connection, job_id, REVIEW_READY_STATUS)
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


@router.post("/{job_id}/review", response_model=JobReviewRead)
def review_job_endpoint(
    job_id: int,
    payload: JobReviewRequest,
    connection: sqlite3.Connection = Depends(get_db),
) -> JobReviewRead:
    row = _get_job_row(connection, job_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    workspace_path = row["workspace_path"]
    approved_highlight_ids = [int(item) for item in payload.approved_highlight_ids]
    _write_workspace_approved_highlight_ids(workspace_path, approved_highlight_ids)

    connection.execute(
        "UPDATE jobs SET status = ?, failure_message = NULL WHERE id = ?",
        ("reviewed", job_id),
    )

    return JobReviewRead(
        job_id=job_id,
        status="reviewed",
        approved_highlight_ids=approved_highlight_ids,
    )


@router.post("/{job_id}/export", response_model=JobExportRead)
def export_job_endpoint(
    job_id: int, connection: sqlite3.Connection = Depends(get_db)
) -> JobExportRead:
    row = _get_job_row(connection, job_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    workspace_path = row["workspace_path"]
    approved_highlight_ids = _read_workspace_approved_highlight_ids(workspace_path)
    highlights = _read_workspace_highlights(workspace_path)
    approved_clips = [
        highlight.model_dump()
        for index, highlight in enumerate(highlights)
        if index in approved_highlight_ids
    ]
    exported_files = export_service.export_job_workspace(
        workspace_path=workspace_path,
        clips=approved_clips,
    )
    output_file = exported_files[-1]
    _write_workspace_output_file(workspace_path, output_file)

    connection.execute(
        "UPDATE jobs SET status = ?, failure_message = NULL WHERE id = ?",
        ("exported", job_id),
    )

    return JobExportRead(job_id=job_id, status="exported", output_file=output_file)


@router.get("/{job_id}/download")
def download_job_export_endpoint(
    job_id: int, connection: sqlite3.Connection = Depends(get_db)
) -> FileResponse:
    row = _get_job_row(connection, job_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    output_file = _read_workspace_output_file(row["workspace_path"])
    if not output_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Export file not found"
        )

    output_path = Path(output_file)
    if not output_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Export file not found"
        )

    return FileResponse(output_path, filename=output_path.name)
