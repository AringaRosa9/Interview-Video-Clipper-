from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> TestClient:
    db_path = tmp_path / "test-app.db"
    monkeypatch.setenv("APP_DATABASE_URL", f"sqlite:///{db_path}")

    from app.main import app

    return TestClient(app)
