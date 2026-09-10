from pydantic import BaseModel, Field


class EventLogEntry(BaseModel):
    id: str
    timestamp: str
    level: str
    source: str
    message: str


class Satellite(BaseModel):
    id: str
    name: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    altitude_km: float = Field(gt=0)
    velocity_km_s: float = Field(gt=0)
    health: str
    risk_score: int = Field(ge=0, le=100)
    status: str
    inclination: float = Field(ge=0, le=180)
    orbital_period_minutes: float = Field(gt=0)
    phase: float = Field(ge=0, le=360)


class DebrisObject(BaseModel):
    id: str
    name: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    altitude_km: float = Field(gt=0)
    velocity_km_s: float = Field(gt=0)


class ConjunctionAlert(BaseModel):
    id: str
    satellite_id: str
    satellite_name: str
    debris_id: str
    debris_name: str
    estimated_distance_km: float = Field(ge=0)
    time_to_closest_approach_seconds: int = Field(ge=0)
    severity: str
    recommendation: str


class CommanderAssessment(BaseModel):
    summary: str
    severity: str
    likely_cause: str
    recommended_actions: list[str]
    confidence: int = Field(ge=0, le=100)
    systems_affected: list[str]


class ResponseActionRequest(BaseModel):
    action: str
    satellite_id: str | None = None


class ResponseActionResult(BaseModel):
    action: str
    result: str
    affected_systems: list[str]
    risk_score_delta: int
    explanation: str
    event: EventLogEntry


class Threat(BaseModel):
    id: str
    type: str
    name: str
    affected_satellite_id: str
    affected_satellite_name: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    altitude_km: float = Field(gt=0)
    severity: str
    confidence: int = Field(ge=0, le=100)
    recommended_response: str
    status: str
    description: str


class ScenarioDefinition(BaseModel):
    name: str
    description: str
    threat_type: str
    affected_satellite_id: str
    affected_satellite_name: str
    recommended_response: str


class ScenarioStartRequest(BaseModel):
    name: str


class ScenarioStartResponse(BaseModel):
    scenario_id: str
    name: str
    status: str
    event: EventLogEntry


class ScenarioControlRequest(BaseModel):
    outcome: str = "contained"


class ScenarioControlResponse(BaseModel):
    scenario_id: str | None
    status: str
    event: EventLogEntry


class ActiveScenarioResponse(BaseModel):
    scenario_id: str | None = None
    name: str | None = None
    status: str | None = None
    started_at: str | None = None


class ScenarioRunSummary(BaseModel):
    id: str
    name: str
    started_at: str
    status: str
    frame_count: int


class OperatorNoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    author: str = Field(default="Operator", min_length=1, max_length=80)
    category: str = Field(default="observation", min_length=1, max_length=80)
    elapsed_seconds: float | None = Field(default=None, ge=0)


class OperatorNote(BaseModel):
    id: int
    scenario_id: str
    timestamp: str
    elapsed_seconds: float | None = None
    author: str
    category: str
    body: str


class ReplayFrame(BaseModel):
    id: int
    scenario_id: str
    elapsed_seconds: float
    kind: str
    payload: dict


class ScenarioReplay(BaseModel):
    scenario: ScenarioRunSummary
    timeline: list[ReplayFrame]
    notes: list[OperatorNote] = []
