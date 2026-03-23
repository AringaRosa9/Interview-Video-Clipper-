import sqlite3
from pathlib import Path

import pytest


def test_create_job_returns_queued_status(client, profile_id):
    payload = {
        "video_url": "https://cdn.example.com/interview.mp4",
        "candidate_name": "候选人A",
        "profile_id": profile_id,
        "target_duration_seconds": 45,
    }

    response = client.post("/api/jobs", json=payload)

    assert response.status_code == 201
    assert response.json()["status"] == "queued"


def test_create_job_creates_workspace_directory(client, profile_id, db_path):
    response = client.post(
        "/api/jobs",
        json={
            "video_url": "https://cdn.example.com/interview.mp4",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 45,
        },
    )

    assert response.status_code == 201
    workspace_path = Path(response.json()["workspace_path"])
    assert workspace_path.exists()
    assert workspace_path.is_dir()
    assert workspace_path.parent == db_path.parent / "data" / "jobs"


def test_get_job_returns_persisted_status(client, profile_id):
    create_response = client.post(
        "/api/jobs",
        json={
            "video_url": "https://cdn.example.com/interview.mp4",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 45,
        },
    )
    job_id = create_response.json()["id"]

    response = client.get(f"/api/jobs/{job_id}")

    assert response.status_code == 200
    assert response.json()["id"] == job_id
    assert response.json()["status"] == "queued"
    assert response.json()["failure_message"] is None


def test_get_job_highlights_returns_empty_list(client, profile_id):
    create_response = client.post(
        "/api/jobs",
        json={
            "video_url": "https://cdn.example.com/interview.mp4",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 45,
        },
    )
    job_id = create_response.json()["id"]

    response = client.get(f"/api/jobs/{job_id}/highlights")

    assert response.status_code == 200
    assert response.json() == {"job_id": job_id, "status": "queued", "items": []}


def test_get_missing_job_returns_not_found(client):
    response = client.get("/api/jobs/9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found"}


def test_create_job_rejects_invalid_video_url(client, profile_id):
    response = client.post(
        "/api/jobs",
        json={
            "video_url": "not-a-url",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 45,
        },
    )

    assert response.status_code == 422


def test_create_job_rejects_non_positive_target_duration(client, profile_id):
    response = client.post(
        "/api/jobs",
        json={
            "video_url": "https://cdn.example.com/interview.mp4",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 0,
        },
    )

    assert response.status_code == 422


def test_database_connection_enforces_job_profile_foreign_key(client):
    from app.db import get_connection

    with pytest.raises(sqlite3.IntegrityError):
        with get_connection() as connection:
            connection.execute(
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
                    "https://cdn.example.com/interview.mp4",
                    "候选人A",
                    9999,
                    45,
                    "queued",
                    "/tmp/missing-profile-job",
                    None,
                ),
            )


def test_create_job_does_not_persist_when_workspace_allocation_fails(
    client, profile_id, monkeypatch
):
    from app.db import get_connection
    from app.routers import jobs as jobs_router

    monkeypatch.setattr(
        jobs_router,
        "allocate_job_workspace",
        lambda _: (_ for _ in ()).throw(OSError("disk full")),
    )

    with pytest.raises(OSError):
        client.post(
            "/api/jobs",
            json={
                "video_url": "https://cdn.example.com/interview.mp4",
                "candidate_name": "候选人A",
                "profile_id": profile_id,
                "target_duration_seconds": 45,
            },
        )

    with get_connection() as connection:
        row = connection.execute("SELECT COUNT(*) AS count FROM jobs").fetchone()

    assert row["count"] == 0
