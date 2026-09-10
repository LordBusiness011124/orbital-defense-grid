from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC
from datetime import datetime
from uuid import uuid4

from app.models import EventLogEntry
from app.models import ResponseActionResult
from app.models import Satellite
from app.models import ScenarioControlResponse
from app.models import ScenarioDefinition
from app.models import ScenarioStartResponse
from app.models import Threat
from app.simulation.orbit_engine import normalize_longitude


@dataclass(frozen=True)
class ScenarioProfile:
    name: str
    description: str
    threat_type: str
    affected_satellite_id: str
    affected_satellite_name: str
    recommended_response: str
    good_actions: set[str]


SUPPORTED_RESPONSE_ACTIONS = {
    "quarantine_telemetry",
    "switch_to_inertial_estimate",
    "block_ground_station_commands",
    "simulate_evasive_maneuver",
    "increase_tracking_priority",
    "safe_mode",
    "request_human_review",
}
SCENARIO_PROFILES = {
    "Telemetry Spoofing on ORION-3": ScenarioProfile(
        name="Telemetry Spoofing on ORION-3",
        description="ORION-3 reports impossible position and velocity changes without a logged maneuver.",
        threat_type="telemetry_spoofing",
        affected_satellite_id="sat-orion-3",
        affected_satellite_name="ORION-3",
        recommended_response="Quarantine telemetry and switch ORION-3 to inertial estimate mode.",
        good_actions={
            "quarantine_telemetry",
            "switch_to_inertial_estimate",
            "block_ground_station_commands",
            "increase_tracking_priority",
            "request_human_review",
        },
    ),
    "GPS Jamming near AEGIS-4": ScenarioProfile(
        name="GPS Jamming near AEGIS-4",
        description="AEGIS-4 loses navigation confidence while passing through a simulated interference zone.",
        threat_type="gps_jamming",
        affected_satellite_id="sat-aegis-4",
        affected_satellite_name="AEGIS-4",
        recommended_response="Increase tracking priority and switch AEGIS-4 to inertial estimate mode.",
        good_actions={
            "increase_tracking_priority",
            "switch_to_inertial_estimate",
            "request_human_review",
        },
    ),
    "Unauthorized Command Attempt on HELIO-5": ScenarioProfile(
        name="Unauthorized Command Attempt on HELIO-5",
        description="HELIO-5 receives simulated suspicious command packets from an untrusted ground path.",
        threat_type="unauthorized_command",
        affected_satellite_id="sat-helio-5",
        affected_satellite_name="HELIO-5",
        recommended_response="Block ground station commands and place HELIO-5 in safe mode if command attempts continue.",
        good_actions={
            "block_ground_station_commands",
            "safe_mode",
            "request_human_review",
        },
    ),
}


def available_scenarios() -> list[ScenarioDefinition]:
    return [
        ScenarioDefinition(
            name=profile.name,
            description=profile.description,
            threat_type=profile.threat_type,
            affected_satellite_id=profile.affected_satellite_id,
            affected_satellite_name=profile.affected_satellite_name,
            recommended_response=profile.recommended_response,
        )
        for profile in SCENARIO_PROFILES.values()
    ]


class ThreatEngine:
    def __init__(self) -> None:
        self.scenario_id: str | None = None
        self.scenario_name: str | None = None
        self.scenario_started_at: str | None = None
        self.started_at: float | None = None
        self.events: list[EventLogEntry] = []
        self._milestones: set[str] = set()
        self.response_actions: list[str] = []
        self.risk_score_delta = 0
        self.telemetry_quarantined = False
        self.inertial_estimate_enabled = False
        self.ground_station_commands_blocked = False

    def start_scenario(self, name: str) -> ScenarioStartResponse:
        if name not in SCENARIO_PROFILES:
            raise ValueError(f"Unsupported scenario: {name}")

        self.scenario_id = f"scenario-{uuid4().hex[:8]}"
        self.scenario_name = name
        self.scenario_started_at = datetime.now(UTC).isoformat()
        self.started_at = time.monotonic()
        self.events = []
        self._milestones = set()
        self.response_actions = []
        self.risk_score_delta = 0
        self.telemetry_quarantined = False
        self.inertial_estimate_enabled = False
        self.ground_station_commands_blocked = False

        event = self._add_event(
            level="warning",
            source="scenario_engine",
            message=f"Scenario started: {name}.",
        )

        return ScenarioStartResponse(
            scenario_id=self.scenario_id,
            name=name,
            status="running",
            event=event,
        )

    def end_scenario(self, outcome: str = "contained") -> ScenarioControlResponse:
        scenario_id = self.scenario_id
        status = normalize_outcome(outcome)
        event = self._add_event(
            level="info",
            source="scenario_engine",
            message=f"Scenario ended with outcome: {status}.",
        )
        self._clear_active_scenario(keep_events=True)

        return ScenarioControlResponse(
            scenario_id=scenario_id,
            status=status,
            event=event,
        )

    def reset_scenario(self) -> ScenarioControlResponse:
        scenario_id = self.scenario_id
        event = self._add_event(
            level="info",
            source="scenario_engine",
            message="Simulation reset to baseline state.",
        )
        self._clear_active_scenario(keep_events=False)

        return ScenarioControlResponse(
            scenario_id=scenario_id,
            status="reset",
            event=event,
        )

    def apply(self, satellites: list[Satellite]) -> tuple[list[Satellite], list[Threat], list[EventLogEntry]]:
        if self.started_at is None:
            return satellites, [], self.events[-20:]

        elapsed_seconds = time.monotonic() - self.started_at
        profile = self._active_profile()
        if profile is None:
            return satellites, [], self.events[-20:]

        updated = [self._apply_scenario(satellite, elapsed_seconds, profile) for satellite in satellites]
        affected = next((satellite for satellite in updated if satellite.id == profile.affected_satellite_id), None)
        threats = [self._build_threat(affected, elapsed_seconds, profile)] if affected else []

        return updated, threats, self.events[-20:]

    def active_threats(self, satellites: list[Satellite]) -> list[Threat]:
        _, threats, _ = self.apply(satellites)
        return threats

    def recent_events(self) -> list[EventLogEntry]:
        return self.events[-20:]

    def active_scenario_id(self) -> str | None:
        return self.scenario_id

    def active_scenario_name(self) -> str | None:
        return self.scenario_name

    def active_scenario_started_at(self) -> str | None:
        return self.scenario_started_at

    def elapsed_seconds(self) -> float | None:
        if self.started_at is None:
            return None

        return round(time.monotonic() - self.started_at, 3)

    def scenario_elapsed_seconds(self) -> float | None:
        return self.elapsed_seconds()

    def apply_response_action(
        self,
        action: str,
        satellite_id: str | None = None,
    ) -> ResponseActionResult:
        if action not in SUPPORTED_RESPONSE_ACTIONS:
            raise ValueError(f"Unsupported response action: {action}")

        profile = self._active_profile()
        affected_satellite = satellite_id or profile.affected_satellite_id if profile else "sat-orion-3"
        action_is_relevant = (
            self.started_at is not None
            and profile is not None
            and affected_satellite == profile.affected_satellite_id
            and action in profile.good_actions
        )

        risk_score_delta = self._risk_delta_for_action(action, action_is_relevant)
        self.risk_score_delta += risk_score_delta
        self.response_actions.append(action)

        if action == "quarantine_telemetry" and action_is_relevant:
            self.telemetry_quarantined = True
        elif action == "switch_to_inertial_estimate" and action_is_relevant:
            self.inertial_estimate_enabled = True
        elif action == "block_ground_station_commands" and action_is_relevant:
            self.ground_station_commands_blocked = True

        result = "effective" if risk_score_delta < 0 else "limited_effect"
        explanation = self._action_explanation(action, action_is_relevant, profile)
        event = self._add_event(
            level="info" if risk_score_delta < 0 else "warning",
            source="response_simulator",
            message=f"Action taken: {format_action(action)}. {explanation}",
        )

        return ResponseActionResult(
            action=action,
            result=result,
            affected_systems=[affected_satellite],
            risk_score_delta=risk_score_delta,
            explanation=explanation,
            event=event,
        )

    def _active_profile(self) -> ScenarioProfile | None:
        if self.scenario_name is None:
            return None

        return SCENARIO_PROFILES.get(self.scenario_name)

    def _apply_scenario(
        self,
        satellite: Satellite,
        elapsed_seconds: float,
        profile: ScenarioProfile,
    ) -> Satellite:
        if satellite.id != profile.affected_satellite_id:
            return satellite

        if profile.threat_type == "telemetry_spoofing":
            return self._apply_telemetry_spoofing(satellite, elapsed_seconds)
        if profile.threat_type == "gps_jamming":
            return self._apply_gps_jamming(satellite, elapsed_seconds)
        if profile.threat_type == "unauthorized_command":
            return self._apply_unauthorized_command(satellite, elapsed_seconds)

        return satellite

    def _apply_telemetry_spoofing(self, satellite: Satellite, elapsed_seconds: float) -> Satellite:
        payload = satellite.model_dump()

        if elapsed_seconds >= 10:
            self._add_milestone(
                "position_jump",
                "critical",
                "threat_engine",
                "ORION-3 reported an impossible position jump without a logged maneuver.",
            )
            payload["latitude"] = round(max(-90, min(90, satellite.latitude + 7.6)), 4)
            payload["longitude"] = round(normalize_longitude(satellite.longitude + 11.4), 4)
            payload["status"] = "position anomaly"
            payload["risk_score"] = max(payload["risk_score"], 58)
            payload["health"] = "watch"

        if elapsed_seconds >= 15:
            self._add_milestone(
                "velocity_inconsistent",
                "critical",
                "threat_engine",
                "ORION-3 velocity data no longer matches the simulated orbital path.",
            )
            payload["velocity_km_s"] = round(satellite.velocity_km_s + 1.92, 2)
            payload["status"] = "velocity mismatch"
            payload["risk_score"] = max(payload["risk_score"], 72)

        if elapsed_seconds >= 20:
            self._add_milestone(
                "risk_escalated",
                "critical",
                "threat_engine",
                "ORION-3 risk score escalated above 80; telemetry spoofing confidence increased.",
            )
            payload["risk_score"] = 87
            payload["health"] = "critical"
            payload["status"] = "spoofing suspected"

        if self.risk_score_delta:
            payload["risk_score"] = max(0, min(100, payload["risk_score"] + self.risk_score_delta))

        if self.telemetry_quarantined:
            payload["status"] = "telemetry quarantined"
            payload["health"] = "degraded" if payload["risk_score"] > 35 else "watch"

        if self.inertial_estimate_enabled and self.telemetry_quarantined:
            payload["status"] = "stabilized on inertial estimate"
            payload["health"] = "watch"

        return Satellite(**payload)

    def _apply_gps_jamming(self, satellite: Satellite, elapsed_seconds: float) -> Satellite:
        payload = satellite.model_dump()

        if elapsed_seconds >= 8:
            self._add_milestone(
                "gps_signal_degraded",
                "warning",
                "threat_engine",
                "AEGIS-4 signal quality degraded while crossing a simulated jamming zone.",
            )
            payload["status"] = "navigation degraded"
            payload["health"] = "watch"
            payload["risk_score"] = max(payload["risk_score"], 44)

        if elapsed_seconds >= 16:
            self._add_milestone(
                "gps_jamming_confirmed",
                "critical",
                "threat_engine",
                "AEGIS-4 navigation confidence dropped below acceptable limits.",
            )
            payload["latitude"] = round(max(-90, min(90, satellite.latitude - 3.2)), 4)
            payload["longitude"] = round(normalize_longitude(satellite.longitude + 6.8), 4)
            payload["status"] = "gps jamming suspected"
            payload["health"] = "critical"
            payload["risk_score"] = max(payload["risk_score"], 74)

        if self.risk_score_delta:
            payload["risk_score"] = max(0, min(100, payload["risk_score"] + self.risk_score_delta))

        if self.inertial_estimate_enabled:
            payload["status"] = "inertial navigation active"
            payload["health"] = "watch"

        return Satellite(**payload)

    def _apply_unauthorized_command(self, satellite: Satellite, elapsed_seconds: float) -> Satellite:
        payload = satellite.model_dump()

        if elapsed_seconds >= 8:
            self._add_milestone(
                "unauthorized_command_seen",
                "warning",
                "threat_engine",
                "HELIO-5 received a simulated command packet from an untrusted ground path.",
            )
            payload["status"] = "command path anomaly"
            payload["health"] = "degraded"
            payload["risk_score"] = max(payload["risk_score"], 62)

        if elapsed_seconds >= 16:
            self._add_milestone(
                "unauthorized_command_escalated",
                "critical",
                "threat_engine",
                "HELIO-5 command queue shows repeated unauthorized maneuver requests.",
            )
            payload["status"] = "unauthorized command attempt"
            payload["health"] = "critical"
            payload["risk_score"] = max(payload["risk_score"], 82)

        if self.risk_score_delta:
            payload["risk_score"] = max(0, min(100, payload["risk_score"] + self.risk_score_delta))

        if self.ground_station_commands_blocked:
            payload["status"] = "command path blocked"
            payload["health"] = "degraded"

        if "safe_mode" in self.response_actions and self.ground_station_commands_blocked:
            payload["status"] = "safe mode command lockout"
            payload["health"] = "watch"

        return Satellite(**payload)

    def _build_threat(
        self,
        satellite: Satellite,
        elapsed_seconds: float,
        profile: ScenarioProfile,
    ) -> Threat:
        mitigated = self._scenario_mitigated(profile)

        if mitigated:
            severity = "medium"
            confidence = 88
            description = self._mitigated_description(profile)
        elif elapsed_seconds >= self._critical_threshold(profile):
            severity = "critical"
            confidence = self._critical_confidence(profile)
            description = self._critical_description(profile)
        elif elapsed_seconds >= self._high_threshold(profile):
            severity = "high"
            confidence = 78
            description = self._high_description(profile)
        elif elapsed_seconds >= self._medium_threshold(profile):
            severity = "medium"
            confidence = 64
            description = self._medium_description(profile)
        else:
            severity = "low"
            confidence = 42
            description = f"{profile.name} is armed; no anomaly has triggered yet."

        return Threat(
            id=f"threat-{profile.threat_type}-{profile.affected_satellite_id}",
            type=profile.threat_type,
            name=profile.name,
            affected_satellite_id=satellite.id,
            affected_satellite_name=satellite.name,
            latitude=satellite.latitude,
            longitude=satellite.longitude,
            altitude_km=satellite.altitude_km,
            severity=severity,
            confidence=confidence,
            recommended_response=profile.recommended_response,
            status="mitigating" if mitigated else "active",
            description=description,
        )

    def _scenario_mitigated(self, profile: ScenarioProfile) -> bool:
        if profile.threat_type == "telemetry_spoofing":
            return self.telemetry_quarantined or self.inertial_estimate_enabled
        if profile.threat_type == "gps_jamming":
            return self.inertial_estimate_enabled or "increase_tracking_priority" in self.response_actions
        if profile.threat_type == "unauthorized_command":
            return self.ground_station_commands_blocked or "safe_mode" in self.response_actions

        return False

    def _medium_threshold(self, profile: ScenarioProfile) -> int:
        return 10 if profile.threat_type == "telemetry_spoofing" else 8

    def _high_threshold(self, profile: ScenarioProfile) -> int:
        return 15 if profile.threat_type == "telemetry_spoofing" else 12

    def _critical_threshold(self, profile: ScenarioProfile) -> int:
        return 20 if profile.threat_type == "telemetry_spoofing" else 16

    def _critical_confidence(self, profile: ScenarioProfile) -> int:
        return 91 if profile.threat_type == "telemetry_spoofing" else 86

    def _medium_description(self, profile: ScenarioProfile) -> str:
        descriptions = {
            "telemetry_spoofing": "Position telemetry jumped without a corresponding maneuver command.",
            "gps_jamming": "Navigation signal quality is degrading near the simulated interference zone.",
            "unauthorized_command": "A suspicious command packet was rejected by command validation.",
        }
        return descriptions[profile.threat_type]

    def _high_description(self, profile: ScenarioProfile) -> str:
        descriptions = {
            "telemetry_spoofing": "Velocity telemetry is inconsistent with the reported orbital track.",
            "gps_jamming": "Navigation confidence is unstable and requires independent tracking.",
            "unauthorized_command": "Repeated suspicious command attempts are targeting the satellite command path.",
        }
        return descriptions[profile.threat_type]

    def _critical_description(self, profile: ScenarioProfile) -> str:
        descriptions = {
            "telemetry_spoofing": "Position, velocity, and risk telemetry are inconsistent with normal orbit state.",
            "gps_jamming": "Navigation confidence dropped below acceptable limits in the simulated jamming zone.",
            "unauthorized_command": "Unauthorized maneuver requests are accumulating in the simulated command queue.",
        }
        return descriptions[profile.threat_type]

    def _mitigated_description(self, profile: ScenarioProfile) -> str:
        descriptions = {
            "telemetry_spoofing": "Spoofed telemetry is isolated while operators validate inertial estimates.",
            "gps_jamming": "Independent tracking is active while navigation confidence recovers.",
            "unauthorized_command": "Command path is blocked while operators review the simulated intrusion attempt.",
        }
        return descriptions[profile.threat_type]

    def _risk_delta_for_action(self, action: str, action_is_relevant: bool) -> int:
        if not action_is_relevant:
            return 0

        if action == "quarantine_telemetry":
            return -32 if not self.telemetry_quarantined else -4
        if action == "switch_to_inertial_estimate":
            return -16 if not self.inertial_estimate_enabled else -2
        if action == "block_ground_station_commands":
            return -10 if not self.ground_station_commands_blocked else -1
        if action == "increase_tracking_priority":
            return -6
        if action == "safe_mode":
            return -14
        if action == "request_human_review":
            return -3

        return 0

    def _action_explanation(
        self,
        action: str,
        action_is_relevant: bool,
        profile: ScenarioProfile | None,
    ) -> str:
        if not action_is_relevant:
            scenario = profile.name if profile else "scenario"
            return f"Action logged, but it does not materially affect the current {scenario}."

        explanations = {
            "quarantine_telemetry": "Spoofed telemetry isolated from command displays; risk score reduced.",
            "switch_to_inertial_estimate": "Navigation estimate switched to simulated inertial mode for cross-checking.",
            "block_ground_station_commands": "Ground station command path blocked for the affected satellite.",
            "increase_tracking_priority": "Tracking priority increased for independent orbit validation.",
            "safe_mode": "Satellite placed in simulated safe mode while command integrity is reviewed.",
            "request_human_review": "Human review requested; incident handling confidence improved.",
        }
        return explanations.get(action, "Action logged with limited effect on this simulated scenario.")

    def _add_milestone(self, key: str, level: str, source: str, message: str) -> None:
        if key in self._milestones:
            return

        self._milestones.add(key)
        self._add_event(level=level, source=source, message=message)

    def _add_event(self, level: str, source: str, message: str) -> EventLogEntry:
        event = EventLogEntry(
            id=f"evt-{uuid4().hex[:10]}",
            timestamp=datetime.now(UTC).isoformat(),
            level=level,
            source=source,
            message=message,
        )
        self.events.append(event)
        return event

    def _clear_active_scenario(self, keep_events: bool) -> None:
        preserved_events = self.events[-20:] if keep_events else []
        self.scenario_id = None
        self.scenario_name = None
        self.scenario_started_at = None
        self.started_at = None
        self._milestones = set()
        self.response_actions = []
        self.risk_score_delta = 0
        self.telemetry_quarantined = False
        self.inertial_estimate_enabled = False
        self.ground_station_commands_blocked = False
        self.events = preserved_events


def format_action(action: str) -> str:
    return action.replace("_", " ").title()


def normalize_outcome(outcome: str) -> str:
    normalized = outcome.strip().lower().replace(" ", "_")
    if normalized in {"contained", "resolved", "failed"}:
        return normalized

    return "contained"
