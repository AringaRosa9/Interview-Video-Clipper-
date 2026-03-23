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
