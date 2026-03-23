import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db import get_db
from app.schemas.profile import (
    ProfileConnectionTestRequest,
    ProfileConnectionTestResult,
    ProfileCreate,
    ProfileRead,
    ProfileUpdate,
)
from app.services import profile_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.post("", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile_endpoint(
    payload: ProfileCreate, connection: sqlite3.Connection = Depends(get_db)
) -> ProfileRead:
    profile = profile_service.create_profile(connection, payload)
    return ProfileRead.model_validate(profile)


@router.get("", response_model=list[ProfileRead])
def list_profiles_endpoint(
    connection: sqlite3.Connection = Depends(get_db),
) -> list[ProfileRead]:
    return [
        ProfileRead.model_validate(profile)
        for profile in profile_service.list_profiles(connection)
    ]


@router.post("/test-connection", response_model=ProfileConnectionTestResult)
def test_profile_connection_endpoint(
    payload: ProfileConnectionTestRequest,
) -> ProfileConnectionTestResult:
    return profile_service.test_profile_connection(payload)


@router.patch("/{profile_id}", response_model=ProfileRead)
def update_profile_endpoint(
    profile_id: int,
    payload: ProfileUpdate,
    connection: sqlite3.Connection = Depends(get_db),
) -> ProfileRead:
    profile = profile_service.update_profile(connection, profile_id, payload)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return ProfileRead.model_validate(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_endpoint(
    profile_id: int, connection: sqlite3.Connection = Depends(get_db)
) -> Response:
    deleted = profile_service.delete_profile(connection, profile_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
