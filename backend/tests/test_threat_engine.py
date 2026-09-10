from app.simulation.orbit_engine import OrbitEngine
from app.simulation.threat_engine import ThreatEngine


def test_threat_engine_starts_telemetry_spoofing_scenario() -> None:
    orbit_engine = OrbitEngine()
    threat_engine = ThreatEngine()

    response = threat_engine.start_scenario("Telemetry Spoofing on ORION-3")
    satellites, threats, events = threat_engine.apply(orbit_engine.current_satellites())

    assert response.status == "running"
    assert len(satellites) == 5
    assert len(threats) == 1
    assert threats[0].type == "telemetry_spoofing"
    assert events[0].message.startswith("Scenario started")


def test_telemetry_spoofing_escalates_orion_three_risk() -> None:
    orbit_engine = OrbitEngine()
    threat_engine = ThreatEngine()
    threat_engine.start_scenario("Telemetry Spoofing on ORION-3")
    assert threat_engine.started_at is not None
    threat_engine.started_at -= 21

    satellites, threats, events = threat_engine.apply(orbit_engine.current_satellites())
    orion_three = next(satellite for satellite in satellites if satellite.id == "sat-orion-3")

    assert orion_three.risk_score == 87
    assert orion_three.status == "spoofing suspected"
    assert threats[0].severity == "critical"
    assert any("risk score escalated" in event.message for event in events)


def test_quarantine_telemetry_reduces_orion_three_risk() -> None:
    orbit_engine = OrbitEngine()
    threat_engine = ThreatEngine()
    threat_engine.start_scenario("Telemetry Spoofing on ORION-3")
    assert threat_engine.started_at is not None
    threat_engine.started_at -= 21

    result = threat_engine.apply_response_action("quarantine_telemetry", "sat-orion-3")
    satellites, threats, _ = threat_engine.apply(orbit_engine.current_satellites())
    orion_three = next(satellite for satellite in satellites if satellite.id == "sat-orion-3")

    assert result.result == "effective"
    assert result.risk_score_delta < 0
    assert orion_three.risk_score < 87
    assert orion_three.status == "telemetry quarantined"
    assert threats[0].status == "mitigating"


def test_gps_jamming_scenario_targets_aegis_four() -> None:
    orbit_engine = OrbitEngine()
    threat_engine = ThreatEngine()
    threat_engine.start_scenario("GPS Jamming near AEGIS-4")
    assert threat_engine.started_at is not None
    threat_engine.started_at -= 17

    satellites, threats, events = threat_engine.apply(orbit_engine.current_satellites())
    aegis_four = next(satellite for satellite in satellites if satellite.id == "sat-aegis-4")

    assert aegis_four.risk_score >= 74
    assert aegis_four.status == "gps jamming suspected"
    assert threats[0].type == "gps_jamming"
    assert threats[0].affected_satellite_id == "sat-aegis-4"
    assert any("jamming zone" in event.message for event in events)


def test_unauthorized_command_scenario_responds_to_block_commands() -> None:
    orbit_engine = OrbitEngine()
    threat_engine = ThreatEngine()
    threat_engine.start_scenario("Unauthorized Command Attempt on HELIO-5")
    assert threat_engine.started_at is not None
    threat_engine.started_at -= 17

    result = threat_engine.apply_response_action("block_ground_station_commands", "sat-helio-5")
    satellites, threats, _ = threat_engine.apply(orbit_engine.current_satellites())
    helio_five = next(satellite for satellite in satellites if satellite.id == "sat-helio-5")

    assert result.result == "effective"
    assert result.risk_score_delta < 0
    assert helio_five.status == "command path blocked"
    assert threats[0].type == "unauthorized_command"
    assert threats[0].status == "mitigating"


def test_end_scenario_clears_active_threats_but_keeps_closure_event() -> None:
    orbit_engine = OrbitEngine()
    threat_engine = ThreatEngine()
    threat_engine.start_scenario("GPS Jamming near AEGIS-4")

    response = threat_engine.end_scenario("resolved")
    _, threats, events = threat_engine.apply(orbit_engine.current_satellites())

    assert response.status == "resolved"
    assert threats == []
    assert any("Scenario ended" in event.message for event in events)
