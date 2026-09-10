from app.commander.rule_based_commander import RuleBasedCommander
from app.models import Threat
from app.simulation.collision_engine import CollisionEngine
from app.simulation.debris_engine import DebrisEngine
from app.simulation.orbit_engine import OrbitEngine


def test_commander_prioritizes_conjunction_when_no_threats() -> None:
    satellites = OrbitEngine().current_satellites()
    debris = DebrisEngine().current_debris(satellites)
    conjunctions = CollisionEngine().current_alerts(satellites, debris)

    assessment = RuleBasedCommander().assess(satellites, [], [], conjunctions)

    assert assessment.severity in {"high", "critical"}
    assert "AEGIS-4" in assessment.systems_affected
    assert any("evasive maneuver simulation" in action for action in assessment.recommended_actions)


def test_commander_prioritizes_active_threat() -> None:
    satellites = OrbitEngine().current_satellites()
    orion_three = next(satellite for satellite in satellites if satellite.id == "sat-orion-3")
    threat = Threat(
        id="threat-test",
        type="telemetry_spoofing",
        name="Telemetry Spoofing on ORION-3",
        affected_satellite_id=orion_three.id,
        affected_satellite_name=orion_three.name,
        latitude=orion_three.latitude,
        longitude=orion_three.longitude,
        altitude_km=orion_three.altitude_km,
        severity="critical",
        confidence=91,
        recommended_response="Quarantine telemetry.",
        status="active",
        description="Telemetry is inconsistent.",
    )

    assessment = RuleBasedCommander().assess(satellites, [threat], [], [])

    assert assessment.severity == "critical"
    assert assessment.confidence == 91
    assert "ORION-3" in assessment.systems_affected
