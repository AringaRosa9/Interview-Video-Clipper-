from dataclasses import dataclass
from pathlib import Path
import os


def _default_database_url() -> str:
    backend_dir = Path(__file__).resolve().parents[2]
    return f"sqlite:///{backend_dir / 'data' / 'app.db'}"


@dataclass(frozen=True)
class Settings:
    database_url: str = _default_database_url()


def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("APP_DATABASE_URL", _default_database_url()),
    )
