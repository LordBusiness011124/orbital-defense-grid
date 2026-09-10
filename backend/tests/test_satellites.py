from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_satellites_shape() -> None:
    response = client.get("/api/satellites")

    assert response.status_code == 200
    satellites = response.json()
    assert len(satellites) == 5
    assert {
        "id",
        "name",
        "latitude",
        "longitude",
        "altitude_km",
        "velocity_km_s",
        "health",
        "risk_score",
        "status",
        "inclination",
        "orbital_period_minutes",
        "phase",
    }.issubset(satellites[0])


def test_threat_scenario_start() -> None:
    response = client.post(
        "/api/scenarios/start",
        json={"name": "Telemetry Spoofing on ORION-3"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "running"
    assert body["name"] == "Telemetry Spoofing on ORION-3"


def test_available_scenarios_endpoint() -> None:
    response = client.get("/api/scenarios/available")

    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) >= 3
    assert {scenario["threat_type"] for scenario in scenarios} >= {
        "telemetry_spoofing",
        "gps_jamming",
        "unauthorized_command",
    }


def test_unsupported_scenario_rejected() -> None:
    response = client.post(
        "/api/scenarios/start",
        json={"name": "Unsupported Scenario"},
    )

    assert response.status_code == 400


def test_conjunctions_endpoint() -> None:
    response = client.get("/api/conjunctions")

    assert response.status_code == 200
    alerts = response.json()
    assert alerts
    assert {
        "satellite_id",
        "debris_id",
        "estimated_distance_km",
        "time_to_closest_approach_seconds",
        "severity",
        "recommendation",
    }.issubset(alerts[0])


def test_commander_assessment_endpoint() -> None:
    response = client.get("/api/commander/assessment")

    assert response.status_code == 200
    body = response.json()
    assert {
        "summary",
        "severity",
        "likely_cause",
        "recommended_actions",
        "confidence",
        "systems_affected",
    }.issubset(body)


def test_response_action_endpoint() -> None:
    client.post(
        "/api/scenarios/start",
        json={"name": "Telemetry Spoofing on ORION-3"},
    )

    response = client.post(
        "/api/response/action",
        json={"action": "quarantine_telemetry", "satellite_id": "sat-orion-3"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["action"] == "quarantine_telemetry"
    assert body["risk_score_delta"] < 0


def test_scenario_replay_endpoints() -> None:
    started = client.post(
        "/api/scenarios/start",
        json={"name": "Telemetry Spoofing on ORION-3"},
    ).json()

    scenarios_response = client.get("/api/scenarios")
    replay_response = client.get(f"/api/scenarios/{started['scenario_id']}/replay")

    assert scenarios_response.status_code == 200
    assert replay_response.status_code == 200
    assert replay_response.json()["scenario"]["id"] == started["scenario_id"]
    assert replay_response.json()["timeline"]


def test_scenario_end_updates_replay_status() -> None:
    started = client.post(
        "/api/scenarios/start",
        json={"name": "GPS Jamming near AEGIS-4"},
    ).json()

    end_response = client.post("/api/scenarios/end", json={"outcome": "contained"})
    replay_response = client.get(f"/api/scenarios/{started['scenario_id']}/replay")

    assert end_response.status_code == 200
    assert end_response.json()["status"] == "contained"
    assert replay_response.json()["scenario"]["status"] == "contained"
    assert any(
        frame["payload"].get("event", {}).get("message", "").startswith("Scenario ended")
        for frame in replay_response.json()["timeline"]
    )


def test_scenario_reset_endpoint() -> None:
    client.post(
        "/api/scenarios/start",
        json={"name": "Unauthorized Command Attempt on HELIO-5"},
    )

    response = client.post("/api/scenarios/reset")

    assert response.status_code == 200
    assert response.json()["status"] == "reset"


def test_scenario_report_endpoint() -> None:
    started = client.post(
        "/api/scenarios/start",
        json={"name": "Telemetry Spoofing on ORION-3"},
    ).json()

    response = client.get(f"/api/scenarios/{started['scenario_id']}/report")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Incident Report" in response.text
    assert "Telemetry Spoofing on ORION-3" in response.text


def test_unsupported_response_action_rejected() -> None:
    response = client.post(
        "/api/response/action",
        json={"action": "unsupported_action", "satellite_id": "sat-orion-3"},
    )

    assert response.status_code == 400
