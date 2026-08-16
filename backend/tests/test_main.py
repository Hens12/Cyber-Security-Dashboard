import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_dashboard():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "security_score" in data
    assert "active_threats" in data
    assert "system_health" in data


def test_get_threats():
    response = client.get("/api/threats")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "severity" in data[0]
        assert "source_ip" in data[0]


def test_get_incidents():
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "id" in data[0]
        assert "state" in data[0]


def test_get_vulnerabilities():
    response = client.get("/api/vulnerabilities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "cve_id" in data[0]
        assert "cvss_score" in data[0]


def test_get_hosts():
    response = client.get("/api/hosts")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "hostname" in data[0]
        assert "cpu_usage" in data[0]


def test_get_system_status():
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["api_status"] == "online"
    assert data["demo_mode"] is True


def test_login_success():
    payload = {"username": "admin", "password": "sentinel2026"}
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"


def test_login_failure():
    payload = {"username": "admin", "password": "wrongpassword"}
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401


def test_websocket():
    with client.websocket_connect("/ws/security-events") as websocket:
        # Just check connection and close
        pass
