import sqlite3
from pathlib import Path

import pytest


def test_create_job_returns_review_ready_status(client, profile_id):
    payload = {
        "video_url": "https://cdn.example.com/interview.mp4",
        "candidate_name": "候选人A",
        "profile_id": profile_id,
        "target_duration_seconds": 45,
    }

    response = client.post("/api/jobs", json=payload)

    assert response.status_code == 201
    assert response.json()["status"] == "review_ready"


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


def test_start_job_moves_to_transcribing(client, profile_id, monkeypatch):
    monkeypatch.setattr(
        "app.services.media_service.download_video",
        lambda *args, **kwargs: "video.mp4",
    )
    monkeypatch.setattr(
        "app.services.media_service.extract_audio",
        lambda *args, **kwargs: "audio.wav",
    )
    monkeypatch.setattr(
        "app.services.transcription_service.transcribe_audio",
        lambda *args, **kwargs: [],
    )

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
    assert response.json()["status"] == "review_ready"
    workspace_path = Path(response.json()["workspace_path"])
    assert (workspace_path / "video_path.txt").read_text() == "video.mp4"
    assert (workspace_path / "audio_path.txt").read_text() == "audio.wav"
    assert (workspace_path / "highlights.json").exists()


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
    assert response.json()["status"] == "review_ready"
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
    assert response.json() == {
        "job_id": job_id,
        "status": "review_ready",
        "items": [],
    }


def test_get_job_highlights_reads_structured_selector_payload(client, profile_id):
    create_response = client.post(
        "/api/jobs",
        json={
            "video_url": "https://cdn.example.com/interview.mp4",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 45,
        },
    )
    job = create_response.json()
    workspace_path = Path(job["workspace_path"])
    workspace_path.joinpath("highlights.json").write_text(
        """
        {
          "highlights": [
            {
              "start": 5.25,
              "end": 18.75,
              "star_label": "Action+Result",
              "summary": "优化支付系统并提升成功率",
              "reason": "体现明确动作和量化结果",
              "score": 0.92
            }
          ]
        }
        """.strip(),
        encoding="utf-8",
    )

    response = client.get(f"/api/jobs/{job['id']}/highlights")

    assert response.status_code == 200
    assert response.json() == {
        "job_id": job["id"],
        "status": "review_ready",
        "items": [
            {
                "start": 5.25,
                "end": 18.75,
                "star_label": "Action+Result",
                "summary": "优化支付系统并提升成功率",
                "reason": "体现明确动作和量化结果",
                "score": 0.92,
            }
        ],
    }


def test_get_job_highlights_returns_empty_list_for_malformed_payload(client, profile_id):
    create_response = client.post(
        "/api/jobs",
        json={
            "video_url": "https://cdn.example.com/interview.mp4",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 45,
        },
    )
    job = create_response.json()
    workspace_path = Path(job["workspace_path"])
    workspace_path.joinpath("highlights.json").write_text("{not-valid-json", encoding="utf-8")

    response = client.get(f"/api/jobs/{job['id']}/highlights")

    assert response.status_code == 200
    assert response.json() == {
        "job_id": job["id"],
        "status": "review_ready",
        "items": [],
    }


def test_review_persists_approved_highlight_ids_and_export_uses_them(
    client, profile_id, monkeypatch
):
    create_response = client.post(
        "/api/jobs",
        json={
            "video_url": "https://cdn.example.com/interview.mp4",
            "candidate_name": "候选人A",
            "profile_id": profile_id,
            "target_duration_seconds": 45,
        },
    )
    job = create_response.json()
    workspace_path = Path(job["workspace_path"])
    workspace_path.joinpath("highlights.json").write_text(
        """
        {
          "highlights": [
            {
              "start": 5.25,
              "end": 18.75,
              "star_label": "Action+Result",
              "summary": "优化支付系统并提升成功率",
              "reason": "体现明确动作和量化结果",
              "score": 0.92
            },
            {
              "start": 20.0,
              "end": 28.0,
              "star_label": "Situation+Task",
              "summary": "补充项目背景和职责",
              "reason": "覆盖情境和任务描述",
              "score": 0.81
            }
          ]
        }
        """.strip(),
        encoding="utf-8",
    )

    response = client.post(
        f"/api/jobs/{job['id']}/review",
        json={"approved_highlight_ids": [0]},
    )

    assert response.status_code == 200
    assert response.json() == {
        "job_id": job["id"],
        "status": "reviewed",
        "approved_highlight_ids": [0],
    }
    assert workspace_path.joinpath("approved_highlight_ids.json").read_text(
        encoding="utf-8"
    ) == "[0]"

    export_calls: list[dict] = []

    def fake_export_clips(*, workspace_path: str, clips: list[dict]) -> list[str]:
        export_calls.append({"workspace_path": workspace_path, "clips": clips})
        output_path = Path(workspace_path) / "final.mp4"
        output_path.write_bytes(b"final video")
        return [str(output_path)]

    monkeypatch.setattr("app.services.export_service.export_job_workspace", fake_export_clips)

    export_response = client.post(f"/api/jobs/{job['id']}/export")

    assert export_response.status_code == 200
    assert export_response.json() == {
        "job_id": job["id"],
        "status": "exported",
        "output_file": str(workspace_path / "final.mp4"),
    }
    assert export_calls == [
        {
            "workspace_path": str(workspace_path),
            "clips": [
                {
                    "start": 5.25,
                    "end": 18.75,
                    "star_label": "Action+Result",
                    "summary": "优化支付系统并提升成功率",
                    "reason": "体现明确动作和量化结果",
                    "score": 0.92,
                }
            ],
        }
    ]

    download_response = client.get(f"/api/jobs/{job['id']}/download")

    assert download_response.status_code == 200
    assert download_response.content == b"final video"


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


def test_create_job_cleans_workspace_when_pipeline_fails_after_allocation(
    client, profile_id, monkeypatch, db_path
):
    from app.db import get_connection

    monkeypatch.setattr(
        "app.services.media_service.download_video",
        lambda *args, **kwargs: "video.mp4",
    )
    monkeypatch.setattr(
        "app.services.media_service.extract_audio",
        lambda *args, **kwargs: "audio.wav",
    )
    monkeypatch.setattr(
        "app.services.transcription_service.transcribe_audio",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("asr failed")),
    )

    workspace_path = db_path.parent / "data" / "jobs" / "1"

    with pytest.raises(RuntimeError, match="asr failed"):
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
    assert not workspace_path.exists()
