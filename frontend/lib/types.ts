export type Satellite = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude_km: number;
  velocity_km_s: number;
  health: string;
  risk_score: number;
  status: string;
  inclination: number;
  orbital_period_minutes: number;
  phase: number;
};

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type EventLogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "critical" | string;
  source: string;
  message: string;
};

export type Threat = {
  id: string;
  type: string;
  name: string;
  affected_satellite_id: string;
  affected_satellite_name: string;
  latitude: number;
  longitude: number;
  altitude_km: number;
  severity: string;
  confidence: number;
  recommended_response: string;
  status: string;
  description: string;
};

export type DebrisObject = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude_km: number;
  velocity_km_s: number;
};

export type ConjunctionAlert = {
  id: string;
  satellite_id: string;
  satellite_name: string;
  debris_id: string;
  debris_name: string;
  estimated_distance_km: number;
  time_to_closest_approach_seconds: number;
  severity: string;
  recommendation: string;
};

export type ScenarioStartResponse = {
  scenario_id: string;
  name: string;
  status: string;
  event: EventLogEntry;
};

export type ScenarioDefinition = {
  name: string;
  description: string;
  threat_type: string;
  affected_satellite_id: string;
  affected_satellite_name: string;
  recommended_response: string;
};

export type ScenarioControlResponse = {
  scenario_id: string | null;
  status: string;
  event: EventLogEntry;
};

export type ActiveScenarioResponse = {
  scenario_id: string | null;
  name: string | null;
  status: string | null;
  started_at: string | null;
};

export type CommanderAssessment = {
  summary: string;
  severity: string;
  likely_cause: string;
  recommended_actions: string[];
  confidence: number;
  systems_affected: string[];
};

export type ResponseAction =
  | "quarantine_telemetry"
  | "switch_to_inertial_estimate"
  | "block_ground_station_commands"
  | "simulate_evasive_maneuver"
  | "increase_tracking_priority"
  | "safe_mode"
  | "request_human_review";

export type ResponseActionResult = {
  action: ResponseAction;
  result: string;
  affected_systems: string[];
  risk_score_delta: number;
  explanation: string;
  event: EventLogEntry;
};

export type TelemetryMessage = {
  type: "telemetry";
  active_scenario_id?: string | null;
  active_scenario_name?: string | null;
  active_scenario_status?: string | null;
  satellites: Satellite[];
  threats?: Threat[];
  events?: EventLogEntry[];
  debris?: DebrisObject[];
  conjunctions?: ConjunctionAlert[];
};

export type ScenarioRunSummary = {
  id: string;
  name: string;
  started_at: string;
  status: string;
  frame_count: number;
};

export type OperatorNote = {
  id: number;
  scenario_id: string;
  timestamp: string;
  elapsed_seconds: number | null;
  author: string;
  category: string;
  body: string;
};

export type ReplayFrame = {
  id: number;
  scenario_id: string;
  elapsed_seconds: number;
  kind: string;
  payload: {
    satellites?: Satellite[];
    threats?: Threat[];
    events?: EventLogEntry[];
    debris?: DebrisObject[];
    conjunctions?: ConjunctionAlert[];
    event?: EventLogEntry;
    response?: ResponseActionResult;
  };
};

export type ScenarioReplay = {
  scenario: ScenarioRunSummary;
  timeline: ReplayFrame[];
  notes: OperatorNote[];
};
