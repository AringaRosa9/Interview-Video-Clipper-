from app.services import profile_service
from app.schemas.profile import ProfileConnectionTestRequest
import httpx


def test_create_profile(client):
    payload = {
        "name": "默认模型",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-test",
        "model": "gpt-4.1-mini",
    }

    response = client.post("/api/profiles", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "默认模型"
    assert body["model"] == "gpt-4.1-mini"
    assert "api_key" not in body
    assert "api_key_obscured" not in body


def test_startup_creates_database_file(client, db_path):
    assert db_path.exists()


def test_list_profiles_excludes_secret_fields(client):
    create_response = client.post(
        "/api/profiles",
        json={
            "name": "本地配置",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-secret-material",
            "model": "gpt-4.1-mini",
        },
    )
    assert create_response.status_code == 201

    response = client.get("/api/profiles")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "本地配置"
    assert body[0]["model"] == "gpt-4.1-mini"
    assert "api_key" not in body[0]
    assert "api_key_obscured" not in body[0]


def test_update_profile(client):
    create_response = client.post(
        "/api/profiles",
        json={
            "name": "待更新",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-before",
            "model": "gpt-4.1-mini",
        },
    )
    profile_id = create_response.json()["id"]

    response = client.patch(
        f"/api/profiles/{profile_id}",
        json={"name": "已更新", "model": "gpt-4.1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == profile_id
    assert body["name"] == "已更新"
    assert body["model"] == "gpt-4.1"
    assert "api_key" not in body
    assert "api_key_obscured" not in body


def test_delete_profile(client):
    create_response = client.post(
        "/api/profiles",
        json={
            "name": "待删除",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-delete",
            "model": "gpt-4.1-mini",
        },
    )
    profile_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/profiles/{profile_id}")

    assert delete_response.status_code == 204
    list_response = client.get("/api/profiles")
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_update_missing_profile_returns_not_found(client):
    response = client.patch("/api/profiles/9999", json={"name": "missing"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Profile not found"}


def test_delete_missing_profile_returns_not_found(client):
    response = client.delete("/api/profiles/9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Profile not found"}


def test_profile_connection_test_returns_provider_status(client, monkeypatch):
    monkeypatch.setattr(
        profile_service,
        "test_profile_connection",
        lambda payload: {"status": "ok", "message": "连接成功"},
    )

    response = client.post(
        "/api/profiles/test-connection",
        json={
            "base_url": "https://example.com/v1",
            "api_key": "sk-test",
            "model": "demo-model",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] in {"ok", "error"}
    assert response.json()["message"] == "连接成功"


def test_profile_connection_test_maps_authentication_failure(monkeypatch):
    def fake_probe(_: ProfileConnectionTestRequest):
        request = httpx.Request("GET", "https://example.com/v1/models")
        response = httpx.Response(401, request=request)
        raise httpx.HTTPStatusError("unauthorized", request=request, response=response)

    monkeypatch.setattr(profile_service, "_probe_profile_connection", fake_probe)

    result = profile_service.test_profile_connection(
        ProfileConnectionTestRequest(
            base_url="https://example.com/v1",
            api_key="sk-test",
            model="demo-model",
        )
    )

    assert result.status == "error"
    assert result.message == "认证失败"


def test_profile_connection_test_maps_invalid_url(monkeypatch):
    monkeypatch.setattr(
        profile_service,
        "_probe_profile_connection",
        lambda _: (_ for _ in ()).throw(httpx.InvalidURL("bad url")),
    )

    result = profile_service.test_profile_connection(
        ProfileConnectionTestRequest(
            base_url="bad-url",
            api_key="sk-test",
            model="demo-model",
        )
    )

    assert result.status == "error"
    assert result.message == "地址无效"


def test_profile_connection_test_maps_probe_404_to_invalid_url(monkeypatch):
    def fake_probe(_: ProfileConnectionTestRequest):
        request = httpx.Request("GET", "https://example.com/v1/models")
        response = httpx.Response(404, request=request)
        raise httpx.HTTPStatusError("not found", request=request, response=response)

    monkeypatch.setattr(profile_service, "_probe_profile_connection", fake_probe)

    result = profile_service.test_profile_connection(
        ProfileConnectionTestRequest(
            base_url="https://example.com/v1",
            api_key="sk-test",
            model="demo-model",
        )
    )

    assert result.status == "error"
    assert result.message == "地址无效"


def test_profile_connection_test_maps_model_unavailable(monkeypatch):
    monkeypatch.setattr(
        profile_service,
        "_probe_profile_connection",
        lambda _: {"data": [{"id": "other-model"}]},
    )

    result = profile_service.test_profile_connection(
        ProfileConnectionTestRequest(
            base_url="https://example.com/v1",
            api_key="sk-test",
            model="demo-model",
        )
    )

    assert result.status == "error"
    assert result.message == "模型不可用"


def test_profile_connection_test_maps_timeout(monkeypatch):
    monkeypatch.setattr(
        profile_service,
        "_probe_profile_connection",
        lambda _: (_ for _ in ()).throw(httpx.ReadTimeout("timed out")),
    )

    result = profile_service.test_profile_connection(
        ProfileConnectionTestRequest(
            base_url="https://example.com/v1",
            api_key="sk-test",
            model="demo-model",
        )
    )

    assert result.status == "error"
    assert result.message == "连接超时"
