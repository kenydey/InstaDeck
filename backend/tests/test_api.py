from __future__ import annotations

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_settings_put_partial(client: TestClient) -> None:
    r2 = client.put("/api/v1/settings", json={"defaults": {"content_type": "market_research"}})
    assert r2.status_code == 200
    assert r2.json()["defaults"]["content_type"] == "market_research"


def test_llm_vendors(client: TestClient) -> None:
    r = client.get("/api/v1/llm/vendors")
    assert r.status_code == 200
    ids = {x["vendor_id"] for x in r.json()}
    assert "openai" in ids and "mock" in ids


def test_get_settings_masks_llm_api_key(client: TestClient) -> None:
    put = client.put(
        "/api/v1/settings",
        json={"llm_outline": {"api_key": "sk-test-secret-key-abcdef", "vendor_id": "openai"}},
    )
    assert put.status_code == 200
    r = client.get("/api/v1/settings")
    assert r.status_code == 200
    body = r.json()["llm_outline"]
    assert "api_key" not in body
    assert body.get("api_key_configured") is True
    assert isinstance(body.get("api_key_masked"), str)


def test_templates_lists_builtin(client: TestClient) -> None:
    r = client.get("/api/v1/templates")
    assert r.status_code == 200
    ids = {x["id"] for x in r.json()}
    assert "builtin:default" in ids


def test_generate_outline_mock(client: TestClient) -> None:
    r = client.post(
        "/api/v1/generate-outline",
        json={
            "source_type": "brief",
            "brief": "We are launching a carbon-neutral logistics product in APAC.",
            "deck_profile": {"visual_style": "minimal", "content_type": "product_launch"},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "slides" in data and len(data["slides"]) >= 1


def test_render_pptx(client: TestClient) -> None:
    gen = client.post(
        "/api/v1/generate-outline",
        json={"source_type": "brief", "brief": "Q1 revenue up 12% YoY."},
    )
    pres = gen.json()
    r = client.post("/api/v1/render-pptx", json={"presentation": pres})
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/vnd.openxmlformats")


def test_lint_presentation(client: TestClient) -> None:
    gen = client.post(
        "/api/v1/generate-outline",
        json={"source_type": "brief", "brief": "Test deck."},
    )
    pres = gen.json()
    r = client.post("/api/v1/presentation/lint", json=pres)
    assert r.status_code == 200
    assert "warnings" in r.json()


def test_unknown_template_render(client: TestClient) -> None:
    gen = client.post(
        "/api/v1/generate-outline",
        json={"source_type": "brief", "brief": "x"},
    )
    pres = gen.json()
    r = client.post(
        "/api/v1/render-pptx",
        json={"presentation": pres, "deck_profile": {"template_id": "builtin:missing_xyz"}},
    )
    assert r.status_code == 400
    assert r.json()["detail"]["error_code"] == "unknown_template_id"
