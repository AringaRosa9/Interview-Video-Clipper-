from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    return tmp_path / "test-app.db"


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, db_path: Path) -> TestClient:
    monkeypatch.setenv("APP_DATABASE_URL", f"sqlite:///{db_path}")

    from app.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture
def profile_id(client: TestClient) -> int:
    response = client.post(
        "/api/profiles",
        json={
            "name": "默认模型",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-test",
            "model": "gpt-4.1-mini",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]
