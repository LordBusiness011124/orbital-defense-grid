import type { TelemetryMessage } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function getTelemetryWebSocketUrl() {
  const apiUrl = new URL(API_BASE_URL);
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = "/ws/telemetry";
  apiUrl.search = "";
  apiUrl.hash = "";

  return apiUrl.toString();
}

export function parseTelemetryMessage(data: string): TelemetryMessage | null {
  let parsed: Partial<TelemetryMessage>;

  try {
    parsed = JSON.parse(data) as Partial<TelemetryMessage>;
  } catch {
    return null;
  }

  if (parsed.type !== "telemetry" || !Array.isArray(parsed.satellites)) {
    return null;
  }

  return {
    active_scenario_id: parsed.active_scenario_id ?? null,
    active_scenario_name: parsed.active_scenario_name ?? null,
    active_scenario_status: parsed.active_scenario_status ?? null,
    conjunctions: Array.isArray(parsed.conjunctions) ? parsed.conjunctions : [],
    debris: Array.isArray(parsed.debris) ? parsed.debris : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
    satellites: parsed.satellites,
    threats: Array.isArray(parsed.threats) ? parsed.threats : [],
    type: "telemetry",
  };
}
