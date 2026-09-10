from __future__ import annotations

from app.models import CommanderAssessment
from app.models import ConjunctionAlert
from app.models import EventLogEntry
from app.models import Satellite
from app.models import Threat


SEVERITY_RANK = {
    "nominal": 0,
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


class RuleBasedCommander:
    def assess(
        self,
        satellites: list[Satellite],
        threats: list[Threat],
        events: list[EventLogEntry],
        conjunctions: list[ConjunctionAlert],
    ) -> CommanderAssessment:
        del events
        affected_systems = affected_satellites(satellites, threats, conjunctions)

        if threats and conjunctions:
            worst_threat = max(threats, key=lambda threat: SEVERITY_RANK.get(threat.severity, 0))
            closest_conjunction = min(
                conjunctions,
                key=lambda alert: alert.estimated_distance_km,
            )
            return CommanderAssessment(
                summary=(
                    f"{worst_threat.affected_satellite_name} is under a simulated "
                    f"{worst_threat.type.replace('_', ' ')} condition while "
                    f"{closest_conjunction.satellite_name} has an active debris conjunction."
                ),
                severity=max_severity([worst_threat.severity, closest_conjunction.severity]),
                likely_cause="Concurrent simulated cyber telemetry anomaly and orbital debris proximity.",
                recommended_actions=[
                    "Quarantine affected telemetry streams.",
                    "Switch affected satellite navigation to inertial estimate mode.",
                    "Increase tracking priority for the conjunction pair.",
                    "Run evasive maneuver simulation before authorizing any maneuver.",
                    "Preserve event logs for incident review.",
                ],
                confidence=max(worst_threat.confidence, 86),
                systems_affected=affected_systems,
            )

        if threats:
            worst_threat = max(threats, key=lambda threat: SEVERITY_RANK.get(threat.severity, 0))
            return CommanderAssessment(
                summary=(
                    f"{worst_threat.affected_satellite_name} is likely experiencing "
                    f"{worst_threat.type.replace('_', ' ')}. {worst_threat.description}"
                ),
                severity=worst_threat.severity,
                likely_cause=likely_cause_for_threat(worst_threat),
                recommended_actions=recommended_actions_for_threat(worst_threat),
                confidence=worst_threat.confidence,
                systems_affected=affected_systems,
            )

        if conjunctions:
            closest_conjunction = min(
                conjunctions,
                key=lambda alert: alert.estimated_distance_km,
            )
            return CommanderAssessment(
                summary=(
                    f"{closest_conjunction.satellite_name} has a debris conjunction with "
                    f"{closest_conjunction.debris_name}; estimated miss distance is "
                    f"{closest_conjunction.estimated_distance_km:.2f} km."
                ),
                severity=closest_conjunction.severity,
                likely_cause="Simulated debris object inside the 25 km conjunction threshold.",
                recommended_actions=[
                    "Increase tracking priority.",
                    "Run evasive maneuver simulation.",
                    "Notify flight dynamics operator.",
                    "Continue passive cyber monitoring.",
                ],
                confidence=82,
                systems_affected=affected_systems,
            )

        return CommanderAssessment(
            summary="No active cyber threats or conjunction alerts are present.",
            severity="nominal",
            likely_cause="Nominal simulated operations.",
            recommended_actions=[
                "Continue telemetry monitoring.",
                "Maintain conjunction screening.",
            ],
            confidence=72,
            systems_affected=[],
        )


def affected_satellites(
    satellites: list[Satellite],
    threats: list[Threat],
    conjunctions: list[ConjunctionAlert],
) -> list[str]:
    affected_ids = {threat.affected_satellite_id for threat in threats}
    affected_ids.update(alert.satellite_id for alert in conjunctions)

    names_by_id = {satellite.id: satellite.name for satellite in satellites}
    return sorted(names_by_id[satellite_id] for satellite_id in affected_ids if satellite_id in names_by_id)


def max_severity(severities: list[str]) -> str:
    return max(severities, key=lambda severity: SEVERITY_RANK.get(severity, 0))


def likely_cause_for_threat(threat: Threat) -> str:
    causes = {
        "telemetry_spoofing": "Simulated telemetry spoofing based on position and velocity inconsistency.",
        "gps_jamming": "Simulated navigation interference causing degraded positioning confidence.",
        "unauthorized_command": "Simulated command-path compromise attempt against satellite operations.",
    }
    return causes.get(threat.type, "Simulated space-cyber incident requiring operator review.")


def recommended_actions_for_threat(threat: Threat) -> list[str]:
    actions = {
        "telemetry_spoofing": [
            "Quarantine incoming telemetry.",
            "Switch to inertial estimate mode.",
            "Block commands from affected ground interfaces.",
            "Request human review before accepting maneuver data.",
        ],
        "gps_jamming": [
            "Increase tracking priority.",
            "Switch to inertial estimate mode.",
            "Correlate satellite track with independent sensors.",
            "Request human review before maneuver planning.",
        ],
        "unauthorized_command": [
            "Block affected ground station commands.",
            "Put the satellite in safe mode if command attempts continue.",
            "Preserve command queue and access logs.",
            "Request human review before restoring command paths.",
        ],
    }
    return actions.get(threat.type, [threat.recommended_response, "Preserve event logs for incident review."])
