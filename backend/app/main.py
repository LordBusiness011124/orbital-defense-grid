import asyncio

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .commander.rule_based_commander import RuleBasedCommander
from .config import CELESTRAK_CACHE_PATH
from .config import CELESTRAK_CACHE_TTL_SECONDS
from .config import CELESTRAK_GROUP
from .config import USE_REAL_TLE
from .config import USE_REMOTE_TLE
from .models import CommanderAssessment
from .models import ActiveScenarioResponse
from .models import ConjunctionAlert
from .models import DebrisObject
from .models import EventLogEntry
from .models import OperatorNote
from .models import OperatorNoteCreate
from .models import ResponseActionRequest
from .models import ResponseActionResult
from .models import Satellite
from .models import ScenarioControlRequest
from .models import ScenarioControlResponse
from .models import ScenarioDefinition
from .models import ScenarioReplay
from .models import ScenarioStartRequest
from .models import ScenarioStartResponse
from .models import ScenarioRunSummary
from .models import Threat
from .reports.report_generator import generate_incident_report
from .simulation.collision_engine import CollisionEngine
from .simulation.celestrak_provider import CelesTrakTleProvider
from .simulation.debris_engine import DebrisEngine
from .simulation.orbit_engine import OrbitEngine
from .simulation.tle_loader import TleOrbitProvider
from .simulation.threat_engine import ThreatEngine
from .simulation.threat_engine import available_scenarios
from .storage.replay_store import ReplayStore

app = FastAPI(title="Orbital Defense Grid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if USE_REMOTE_TLE:
    orbit_engine = CelesTrakTleProvider(
        group=CELESTRAK_GROUP,
        cache_path=CELESTRAK_CACHE_PATH,
        cache_ttl_seconds=CELESTRAK_CACHE_TTL_SECONDS,
    )
elif USE_REAL_TLE:
    orbit_engine = TleOrbitProvider()
else:
    orbit_engine = OrbitEngine()
threat_engine = ThreatEngine()
debris_engine = DebrisEngine()
collision_engine = CollisionEngine()
commander = RuleBasedCommander()
replay_store = ReplayStore()


def current_state() -> tuple[list[Satellite], list[Threat], list[EventLogEntry], list[DebrisObject], list[ConjunctionAlert]]:
    satellites, threats, events = threat_engine.apply(orbit_engine.current_satellites())
    debris_objects = debris_engine.current_debris(satellites)
    conjunctions = collision_engine.current_alerts(satellites, debris_objects)
    return satellites, threats, events, debris_objects, conjunctions


def state_payload(
    satellites: list[Satellite],
    threats: list[Threat],
    events: list[EventLogEntry],
    debris_objects: list[DebrisObject],
    conjunctions: list[ConjunctionAlert],
) -> dict:
    return {
        "satellites": [satellite.model_dump() for satellite in satellites],
        "threats": [threat.model_dump() for threat in threats],
        "events": [event.model_dump() for event in events],
        "debris": [debris.model_dump() for debris in debris_objects],
        "conjunctions": [alert.model_dump() for alert in conjunctions],
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/satellites", response_model=list[Satellite])
def get_satellites() -> list[Satellite]:
    satellites, _, _, _, _ = current_state()
    return satellites


@app.get("/api/threats", response_model=list[Threat])
def get_threats() -> list[Threat]:
    _, threats, _, _, _ = current_state()
    return threats


@app.get("/api/debris", response_model=list[DebrisObject])
def get_debris() -> list[DebrisObject]:
    _, _, _, debris_objects, _ = current_state()
    return debris_objects


@app.get("/api/conjunctions", response_model=list[ConjunctionAlert])
def get_conjunctions() -> list[ConjunctionAlert]:
    _, _, _, _, conjunctions = current_state()
    return conjunctions


@app.get("/api/events", response_model=list[EventLogEntry])
def get_events() -> list[EventLogEntry]:
    return threat_engine.recent_events()


@app.get("/api/commander/assessment", response_model=CommanderAssessment)
def get_commander_assessment() -> CommanderAssessment:
    satellites, threats, events, _, conjunctions = current_state()
    return commander.assess(satellites, threats, events, conjunctions)


@app.get("/api/scenarios", response_model=list[ScenarioRunSummary])
def list_scenarios() -> list[ScenarioRunSummary]:
    return replay_store.list_scenarios()


@app.get("/api/scenarios/available", response_model=list[ScenarioDefinition])
def list_available_scenarios() -> list[ScenarioDefinition]:
    return available_scenarios()


@app.get("/api/scenarios/active", response_model=ActiveScenarioResponse)
def get_active_scenario() -> ActiveScenarioResponse:
    return ActiveScenarioResponse(
        scenario_id=threat_engine.active_scenario_id(),
        name=threat_engine.active_scenario_name(),
        status="running" if threat_engine.active_scenario_id() else None,
        started_at=threat_engine.active_scenario_started_at(),
    )


@app.get("/api/scenarios/{scenario_id}/replay", response_model=ScenarioReplay)
def get_scenario_replay(scenario_id: str) -> ScenarioReplay:
    replay = replay_store.get_replay(scenario_id)
    if replay is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return replay


@app.get("/api/scenarios/{scenario_id}/notes", response_model=list[OperatorNote])
def list_operator_notes(scenario_id: str) -> list[OperatorNote]:
    replay = replay_store.get_replay(scenario_id)
    if replay is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return replay.notes


@app.post("/api/scenarios/{scenario_id}/notes", response_model=OperatorNote)
def add_operator_note(scenario_id: str, note: OperatorNoteCreate) -> OperatorNote:
    if replay_store.get_replay(scenario_id) is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if not note.body.strip():
        raise HTTPException(status_code=400, detail="Operator note body cannot be blank")

    elapsed_seconds = note.elapsed_seconds
    if elapsed_seconds is None and threat_engine.active_scenario_id() == scenario_id:
        elapsed_seconds = threat_engine.elapsed_seconds()

    return replay_store.add_operator_note(
        scenario_id=scenario_id,
        body=note.body,
        author=note.author,
        category=note.category,
        elapsed_seconds=elapsed_seconds,
    )


@app.get("/api/scenarios/{scenario_id}/report", response_class=HTMLResponse)
def get_scenario_report(scenario_id: str) -> HTMLResponse:
    replay = replay_store.get_replay(scenario_id)
    if replay is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return HTMLResponse(generate_incident_report(replay))


@app.post("/api/scenarios/start", response_model=ScenarioStartResponse)
def start_scenario(request: ScenarioStartRequest) -> ScenarioStartResponse:
    try:
        response = threat_engine.start_scenario(request.name)
        replay_store.create_scenario(
            scenario_id=response.scenario_id,
            name=response.name,
            started_at=response.event.timestamp,
        )
        replay_store.record_frame(
            scenario_id=response.scenario_id,
            elapsed_seconds=0,
            kind="event",
            payload={"event": response.event.model_dump()},
        )
        satellites, threats, events, debris_objects, conjunctions = current_state()
        replay_store.record_frame(
            scenario_id=response.scenario_id,
            elapsed_seconds=0,
            kind="snapshot",
            payload=state_payload(satellites, threats, events, debris_objects, conjunctions),
        )
        return response
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/scenarios/end", response_model=ScenarioControlResponse)
def end_scenario(request: ScenarioControlRequest) -> ScenarioControlResponse:
    elapsed_seconds = threat_engine.scenario_elapsed_seconds()
    response = threat_engine.end_scenario(request.outcome)
    replay_store.update_scenario_status(response.scenario_id, response.status)
    replay_store.record_frame(
        scenario_id=response.scenario_id,
        elapsed_seconds=elapsed_seconds,
        kind="event",
        payload={"event": response.event.model_dump()},
    )
    satellites, threats, events, debris_objects, conjunctions = current_state()
    replay_store.record_frame(
        scenario_id=response.scenario_id,
        elapsed_seconds=elapsed_seconds,
        kind="snapshot",
        payload=state_payload(satellites, threats, events, debris_objects, conjunctions),
    )
    return response


@app.post("/api/scenarios/reset", response_model=ScenarioControlResponse)
def reset_scenario() -> ScenarioControlResponse:
    elapsed_seconds = threat_engine.scenario_elapsed_seconds()
    response = threat_engine.reset_scenario()
    replay_store.update_scenario_status(response.scenario_id, response.status)
    replay_store.record_frame(
        scenario_id=response.scenario_id,
        elapsed_seconds=elapsed_seconds,
        kind="event",
        payload={"event": response.event.model_dump()},
    )
    return response


@app.post("/api/response/action", response_model=ResponseActionResult)
def apply_response_action(request: ResponseActionRequest) -> ResponseActionResult:
    try:
        result = threat_engine.apply_response_action(
            action=request.action,
            satellite_id=request.satellite_id,
        )
        replay_store.record_frame(
            scenario_id=threat_engine.active_scenario_id(),
            elapsed_seconds=threat_engine.elapsed_seconds(),
            kind="response_action",
            payload={"response": result.model_dump()},
        )
        return result
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.websocket("/ws/telemetry")
async def telemetry_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            satellites, threats, events, debris_objects, conjunctions = current_state()
            payload = state_payload(satellites, threats, events, debris_objects, conjunctions)
            replay_store.record_frame(
                scenario_id=threat_engine.active_scenario_id(),
                elapsed_seconds=threat_engine.elapsed_seconds(),
                kind="snapshot",
                payload=payload,
            )
            await websocket.send_json(
                {
                    "type": "telemetry",
                    "active_scenario_id": threat_engine.active_scenario_id(),
                    "active_scenario_name": threat_engine.active_scenario_name(),
                    "active_scenario_status": "running" if threat_engine.active_scenario_id() else None,
                    **payload,
                }
            )
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
