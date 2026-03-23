import base64
import sqlite3
from typing import Optional

import httpx

from app.models.profile import Profile
from app.schemas.profile import (
    ProfileConnectionTestRequest,
    ProfileConnectionTestResult,
    ProfileCreate,
    ProfileUpdate,
)


class ProfileInUseError(Exception):
    pass


def _obscure_api_key(api_key: str) -> str:
    return base64.urlsafe_b64encode(api_key.encode("utf-8")).decode("ascii")


def _row_to_profile(row: sqlite3.Row) -> Profile:
    return Profile(
        id=row["id"],
        name=row["name"],
        base_url=row["base_url"],
        api_key_obscured=row["api_key_obscured"],
        model=row["model"],
        is_default=bool(row["is_default"]),
        created_at=row["created_at"],
    )


def create_profile(connection: sqlite3.Connection, payload: ProfileCreate) -> Profile:
    cursor = connection.execute(
        """
        INSERT INTO profiles (name, base_url, api_key_obscured, model, is_default)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            payload.name,
            payload.base_url,
            _obscure_api_key(payload.api_key),
            payload.model,
            int(payload.is_default),
        ),
    )
    profile_id = cursor.lastrowid
    row = connection.execute(
        "SELECT * FROM profiles WHERE id = ?",
        (profile_id,),
    ).fetchone()
    return _row_to_profile(row)


def list_profiles(connection: sqlite3.Connection) -> list[Profile]:
    rows = connection.execute(
        "SELECT * FROM profiles ORDER BY id ASC"
    ).fetchall()
    return [_row_to_profile(row) for row in rows]


def update_profile(
    connection: sqlite3.Connection, profile_id: int, payload: ProfileUpdate
) -> Optional[Profile]:
    current = connection.execute(
        "SELECT * FROM profiles WHERE id = ?",
        (profile_id,),
    ).fetchone()
    if current is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    name = updates.get("name", current["name"])
    base_url = updates.get("base_url", current["base_url"])
    model = updates.get("model", current["model"])
    is_default = int(updates.get("is_default", bool(current["is_default"])))
    api_key = updates.get("api_key")
    api_key_obscured = (
        _obscure_api_key(api_key) if api_key is not None else current["api_key_obscured"]
    )

    connection.execute(
        """
        UPDATE profiles
        SET name = ?, base_url = ?, api_key_obscured = ?, model = ?, is_default = ?
        WHERE id = ?
        """,
        (name, base_url, api_key_obscured, model, is_default, profile_id),
    )
    row = connection.execute(
        "SELECT * FROM profiles WHERE id = ?",
        (profile_id,),
    ).fetchone()
    return _row_to_profile(row)


def delete_profile(connection: sqlite3.Connection, profile_id: int) -> bool:
    job_exists = connection.execute(
        "SELECT 1 FROM jobs WHERE profile_id = ? LIMIT 1",
        (profile_id,),
    ).fetchone()
    if job_exists is not None:
        raise ProfileInUseError("Profile is in use by jobs")

    cursor = connection.execute(
        "DELETE FROM profiles WHERE id = ?",
        (profile_id,),
    )
    return cursor.rowcount > 0


def _build_models_url(base_url: str) -> str:
    trimmed = base_url.rstrip("/")
    if trimmed.endswith("/v1"):
        return f"{trimmed}/models"
    return f"{trimmed}/v1/models"


def _normalize_connection_error(error: Exception) -> str:
    if isinstance(error, httpx.TimeoutException):
        return "连接超时"
    if isinstance(error, httpx.InvalidURL):
        return "地址无效"
    if isinstance(error, httpx.RequestError):
        return "连接超时"
    if isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        if status_code in {401, 403}:
            return "认证失败"
        if 500 <= status_code < 600:
            return "连接超时"
        if 400 <= status_code < 500:
            return "地址无效"
    return "地址无效"


def _probe_profile_connection(payload: ProfileConnectionTestRequest) -> dict:
    url = _build_models_url(payload.base_url)
    with httpx.Client(timeout=5.0) as client:
        response = client.get(
            url,
            headers={"Authorization": f"Bearer {payload.api_key}"},
        )
        response.raise_for_status()
        data = response.json()
    return data if isinstance(data, dict) else {}


def test_profile_connection(
    payload: ProfileConnectionTestRequest,
) -> ProfileConnectionTestResult:
    try:
        data = _probe_profile_connection(payload)
    except Exception as error:
        return ProfileConnectionTestResult(
            status="error", message=_normalize_connection_error(error)
        )

    models = data.get("data", [])
    model_ids = {
        item.get("id")
        for item in models
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    if payload.model and payload.model not in model_ids:
        return ProfileConnectionTestResult(status="error", message="模型不可用")

    return ProfileConnectionTestResult(status="ok", message="连接成功")
