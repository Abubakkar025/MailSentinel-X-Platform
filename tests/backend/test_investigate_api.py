import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_emails")

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_investigate_upload_phishing():
    eml_path = os.path.join(SAMPLE_DIR, "phishing_credential.eml")
    with open(eml_path, "rb") as f:
        response = client.post(
            "/api/v1/investigate/upload",
            files={"file": ("phishing_credential.eml", f, "message/rfc822")}
        )

    assert response.status_code == 200
    data = response.json()
    assert "case" in data
    assert "risk_assessment" in data
    assert data["case"]["severity"] in ["high", "critical"]
    assert len(data["ip_locations"]) >= 1
    assert data["sha256_fingerprint"] != ""

def test_list_cases_endpoint():
    res = client.get("/api/v1/cases")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] > 0

def test_dashboard_stats_endpoint():
    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_analyzed" in data
    assert data["total_analyzed"] >= 5
