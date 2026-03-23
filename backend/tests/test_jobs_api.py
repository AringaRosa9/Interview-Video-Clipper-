from pathlib import Path


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
