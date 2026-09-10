from app.models import ReplayFrame
from app.models import ScenarioReplay
from app.models import ScenarioRunSummary
from app.reports.report_generator import generate_incident_report


def test_report_includes_threats_observed_before_final_snapshot() -> None:
    replay = ScenarioReplay(
        scenario=ScenarioRunSummary(
            id="scenario-test",
            name="Telemetry Spoofing on ORION-3",
            started_at="2026-09-09T21:20:05+00:00",
            status="contained",
            frame_count=3,
        ),
        timeline=[
            ReplayFrame(
                id=1,
                scenario_id="scenario-test",
                elapsed_seconds=0,
                kind="snapshot",
                payload={
                    "satellites": [],
                    "threats": [
                        {
                            "id": "threat-orion-3",
                            "name": "Telemetry Spoofing on ORION-3",
                            "type": "telemetry_spoofing",
                            "affected_satellite_name": "ORION-3",
                            "severity": "critical",
                            "confidence": 91,
                            "status": "active",
                        }
                    ],
                    "conjunctions": [],
                },
            ),
            ReplayFrame(
                id=2,
                scenario_id="scenario-test",
                elapsed_seconds=12,
                kind="response_action",
                payload={
                    "response": {
                        "action": "quarantine_telemetry",
                        "result": "effective",
                        "risk_score_delta": -32,
                        "explanation": "Spoofed telemetry isolated.",
                    }
                },
            ),
            ReplayFrame(
                id=3,
                scenario_id="scenario-test",
                elapsed_seconds=15,
                kind="snapshot",
                payload={
                    "satellites": [],
                    "threats": [],
                    "conjunctions": [],
                },
            ),
        ],
    )

    report = generate_incident_report(replay)

    assert "The scenario recorded 1 active threat record(s)" in report
    assert "Telemetry Spoofing on ORION-3" in report
    assert "telemetry_spoofing" in report
    assert "ORION-3" in report
    assert "CRITICAL" in report
