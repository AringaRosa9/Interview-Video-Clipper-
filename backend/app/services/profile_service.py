import base64
import sqlite3
from typing import Optional

from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate


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
    cursor = connection.execute(
        "DELETE FROM profiles WHERE id = ?",
        (profile_id,),
    )
    return cursor.rowcount > 0
