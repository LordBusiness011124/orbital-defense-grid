import type { ActiveScenarioResponse } from "./types";
import type { CommanderAssessment } from "./types";
import type { OperatorNote } from "./types";
import type { ResponseAction } from "./types";
import type { ResponseActionResult } from "./types";
import type { Satellite } from "./types";
import type { ScenarioStartResponse } from "./types";
import type { ScenarioDefinition } from "./types";
import type { ScenarioControlResponse } from "./types";
import type { ScenarioReplay } from "./types";
import type { ScenarioRunSummary } from "./types";
import type { Threat } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function getScenarioReportUrl(scenarioId: string): string {
  return `${API_BASE_URL}/api/scenarios/${scenarioId}/report`;
}

export async function getSatellites(): Promise<Satellite[]> {
  const response = await fetch(`${API_BASE_URL}/api/satellites`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load satellites");
  }

  return response.json();
}

export async function getThreats(): Promise<Threat[]> {
  const response = await fetch(`${API_BASE_URL}/api/threats`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load threats");
  }

  return response.json();
}

export async function getAvailableScenarios(): Promise<ScenarioDefinition[]> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/available`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load available scenarios");
  }

  return response.json();
}

export async function getActiveScenario(): Promise<ActiveScenarioResponse> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/active`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load active scenario");
  }

  return response.json();
}

export async function getCommanderAssessment(): Promise<CommanderAssessment> {
  const response = await fetch(`${API_BASE_URL}/api/commander/assessment`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to generate commander assessment");
  }

  return response.json();
}

export async function startScenario(name: string): Promise<ScenarioStartResponse> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/start`, {
    body: JSON.stringify({ name }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to start scenario");
  }

  return response.json();
}

export async function endScenario(outcome = "contained"): Promise<ScenarioControlResponse> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/end`, {
    body: JSON.stringify({ outcome }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to end scenario");
  }

  return response.json();
}

export async function resetScenario(): Promise<ScenarioControlResponse> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/reset`, {
    cache: "no-store",
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to reset scenario");
  }

  return response.json();
}

export async function applyResponseAction(
  action: ResponseAction,
  satelliteId?: string,
): Promise<ResponseActionResult> {
  const response = await fetch(`${API_BASE_URL}/api/response/action`, {
    body: JSON.stringify({
      action,
      satellite_id: satelliteId,
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to apply response action");
  }

  return response.json();
}

export async function getScenarios(): Promise<ScenarioRunSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load scenarios");
  }

  return response.json();
}

export async function getScenarioReplay(scenarioId: string): Promise<ScenarioReplay> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/${scenarioId}/replay`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load scenario replay");
  }

  return response.json();
}

export async function getOperatorNotes(scenarioId: string): Promise<OperatorNote[]> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/${scenarioId}/notes`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load operator notes");
  }

  return response.json();
}

export async function addOperatorNote(
  scenarioId: string,
  body: string,
  category = "observation",
): Promise<OperatorNote> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/${scenarioId}/notes`, {
    body: JSON.stringify({
      author: "Operator",
      body,
      category,
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to add operator note");
  }

  return response.json();
}
