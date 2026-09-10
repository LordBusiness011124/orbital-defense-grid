"use client";

import { useEffect, useMemo, useState } from "react";
import { CesiumGlobe } from "@/components/CesiumGlobe";
import { CommanderPanel } from "@/components/CommanderPanel";
import { CollisionRiskPanel } from "@/components/CollisionRiskPanel";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { EventLog } from "@/components/EventLog";
import { MissionFlow } from "@/components/MissionFlow";
import { MissionDebriefPanel } from "@/components/MissionDebriefPanel";
import { MissionReadinessPanel } from "@/components/MissionReadinessPanel";
import { OperatorNotesPanel } from "@/components/OperatorNotesPanel";
import { SatelliteList } from "@/components/SatelliteList";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { ThreatPanel } from "@/components/ThreatPanel";
import {
  applyResponseAction,
  addOperatorNote,
  endScenario,
  getActiveScenario,
  getAvailableScenarios,
  getCommanderAssessment,
  getOperatorNotes,
  getSatellites,
  resetScenario,
  startScenario,
} from "@/lib/api";
import type {
  CommanderAssessment,
  ConjunctionAlert,
  ConnectionStatus,
  DebrisObject,
  EventLogEntry,
  OperatorNote,
  ResponseAction,
  ResponseActionResult,
  Satellite,
  ScenarioDefinition,
  Threat,
} from "@/lib/types";
import { getTelemetryWebSocketUrl, parseTelemetryMessage } from "@/lib/websocket";

type RightPanelTab =
  | "readiness"
  | "telemetry"
  | "scenario"
  | "commander"
  | "collision"
  | "notes"
  | "debrief";

const RIGHT_PANEL_TABS: Array<{ id: RightPanelTab; label: string }> = [
  { id: "readiness", label: "Ready" },
  { id: "telemetry", label: "Satellite" },
  { id: "scenario", label: "Scenario" },
  { id: "commander", label: "Commander" },
  { id: "collision", label: "Collision" },
  { id: "notes", label: "Notes" },
  { id: "debrief", label: "Debrief" },
];

export default function Home() {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [threats, setThreats] = useState<Threat[]>([]);
  const [threatEvents, setThreatEvents] = useState<EventLogEntry[]>([]);
  const [debris, setDebris] = useState<DebrisObject[]>([]);
  const [conjunctions, setConjunctions] = useState<ConjunctionAlert[]>([]);
  const [scenarioStarting, setScenarioStarting] = useState(false);
  const [commanderAssessment, setCommanderAssessment] = useState<CommanderAssessment | null>(null);
  const [commanderLoading, setCommanderLoading] = useState(false);
  const [responsePending, setResponsePending] = useState(false);
  const [lastResponseResult, setLastResponseResult] = useState<ResponseActionResult | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("readiness");
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [activeScenarioStatus, setActiveScenarioStatus] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [selectedScenarioName, setSelectedScenarioName] = useState("Telemetry Spoofing on ORION-3");
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState("Ready");
  const [operatorNotes, setOperatorNotes] = useState<OperatorNote[]>([]);

  useEffect(() => {
    getSatellites()
      .then((data) => {
        setSatellites(data);
        setSelectedSatelliteId(data[0]?.id ?? null);
      })
      .catch(() => setError("Backend unavailable. Start FastAPI on port 8000."));
  }, []);

  useEffect(() => {
    getAvailableScenarios()
      .then((data) => {
        setScenarios(data);
        setSelectedScenarioName((current) => current || data[0]?.name || "Telemetry Spoofing on ORION-3");
      })
      .catch(() => setError("Unable to load scenario library. Check backend logs."));
  }, []);

  useEffect(() => {
    let websocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    function connect() {
      setConnectionStatus((current) =>
        current === "connected" ? "connected" : "reconnecting",
      );

      websocket = new WebSocket(getTelemetryWebSocketUrl());

      websocket.onopen = () => {
        setError(null);
        setConnectionStatus("connected");
      };

      websocket.onmessage = (event) => {
        const message = parseTelemetryMessage(event.data);
        if (!message) {
          return;
        }

        setSatellites(message.satellites);
        setThreats(message.threats ?? []);
        setThreatEvents(message.events ?? []);
        setDebris(message.debris ?? []);
        setConjunctions(message.conjunctions ?? []);
        setSelectedSatelliteId((current) => current ?? message.satellites[0]?.id ?? null);
        if (message.active_scenario_id) {
          setActiveScenarioId(message.active_scenario_id);
          setActiveScenarioStatus(message.active_scenario_status ?? "running");
          if (message.active_scenario_name) {
            setSelectedScenarioName(message.active_scenario_name);
          }
        }
      };

      websocket.onerror = () => {
        setConnectionStatus("disconnected");
      };

      websocket.onclose = () => {
        if (closedByCleanup) {
          return;
        }

        setConnectionStatus("reconnecting");
        reconnectTimer = setTimeout(connect, 1500);
      };
    }

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      websocket?.close();
    };
  }, []);

  const selectedSatellite = useMemo(
    () => satellites.find((satellite) => satellite.id === selectedSatelliteId) ?? null,
    [satellites, selectedSatelliteId],
  );
  const activeThreat = threats[0] ?? null;
  const selectedScenario =
    scenarios.find((scenario) => scenario.name === selectedScenarioName) ?? scenarios[0] ?? null;
  const responseTargetId =
    activeThreat?.affected_satellite_id ??
    selectedScenario?.affected_satellite_id ??
    selectedSatelliteId ??
    "sat-orion-3";
  const responseTargetName =
    activeThreat?.affected_satellite_name ??
    satellites.find((satellite) => satellite.id === responseTargetId)?.name ??
    selectedScenario?.affected_satellite_name ??
    null;

  useEffect(() => {
    if (activeThreat?.affected_satellite_id) {
      setSelectedSatelliteId(activeThreat.affected_satellite_id);
    }
  }, [activeThreat?.affected_satellite_id]);

  useEffect(() => {
    getActiveScenario()
      .then((scenario) => {
        if (!scenario.scenario_id) {
          return;
        }

        setActiveScenarioId(scenario.scenario_id);
        setActiveScenarioStatus(scenario.status ?? "running");
        if (scenario.name) {
          setSelectedScenarioName(scenario.name);
        }
      })
      .catch(() => setError("Unable to recover active scenario state. Check backend logs."));
  }, []);

  useEffect(() => {
    if (!activeScenarioId) {
      setOperatorNotes([]);
      return;
    }

    getOperatorNotes(activeScenarioId)
      .then(setOperatorNotes)
      .catch(() => setError("Unable to load operator notes. Check backend logs."));
  }, [activeScenarioId]);

  async function handleStartScenario() {
    setScenarioStarting(true);
    try {
      const response = await startScenario(selectedScenarioName);
      setActiveScenarioId(response.scenario_id);
      setActiveScenarioStatus(response.status);
      setSelectedSatelliteId(selectedScenario?.affected_satellite_id ?? "sat-orion-3");
      setRightPanelTab("scenario");
      setLastResponseResult(null);
      setCommanderAssessment(null);
      setOperatorNotes([]);
      setThreatEvents((current) => [response.event, ...current].slice(0, 20));
    } catch {
      setError("Unable to start scenario. Check backend logs.");
    } finally {
      setScenarioStarting(false);
    }
  }

  async function handleRunGuidedDemo() {
    setDemoRunning(true);
    setScenarioStarting(true);
    setResponsePending(false);
    setLastResponseResult(null);
    setCommanderAssessment(null);
    setRightPanelTab("scenario");

    try {
      setDemoStep("Starting spoofing incident");
      const response = await startScenario("Telemetry Spoofing on ORION-3");
      setActiveScenarioId(response.scenario_id);
      setActiveScenarioStatus(response.status);
      setSelectedScenarioName("Telemetry Spoofing on ORION-3");
      setSelectedSatelliteId("sat-orion-3");
      setOperatorNotes([]);
      setThreatEvents((current) => [response.event, ...current].slice(0, 20));
      setScenarioStarting(false);

      setDemoStep("Waiting for telemetry anomalies");
      await wait(21000);

      setDemoStep("Generating commander assessment");
      setCommanderLoading(true);
      const assessment = await getCommanderAssessment();
      setCommanderAssessment(assessment);
      setRightPanelTab("commander");
      setCommanderLoading(false);
      await recordScenarioNote(
        response.scenario_id,
        `Commander assessment generated: ${assessment.summary}`,
        "assessment",
        false,
      );

      setDemoStep("Quarantining telemetry");
      setResponsePending(true);
      const quarantineResult = await applyResponseAction("quarantine_telemetry", "sat-orion-3");
      setLastResponseResult(quarantineResult);
      setThreatEvents((current) => [quarantineResult.event, ...current].slice(0, 20));
      await recordScenarioNote(response.scenario_id, quarantineResult.explanation, "decision", false);

      await wait(1500);

      setDemoStep("Switching to inertial estimate");
      const inertialResult = await applyResponseAction("switch_to_inertial_estimate", "sat-orion-3");
      setLastResponseResult(inertialResult);
      setThreatEvents((current) => [inertialResult.event, ...current].slice(0, 20));
      await recordScenarioNote(response.scenario_id, inertialResult.explanation, "decision", false);

      await wait(1500);

      setDemoStep("Closing scenario");
      const endResult = await endScenario("contained");
      setActiveScenarioStatus(endResult.status);
      setThreatEvents((current) => [endResult.event, ...current].slice(0, 20));
      setThreats([]);
      setRightPanelTab("debrief");
      setDemoStep("Demo run complete");
    } catch {
      setError("Guided demo failed. Check backend logs.");
      setDemoStep("Demo run failed");
    } finally {
      setScenarioStarting(false);
      setCommanderLoading(false);
      setResponsePending(false);
      setDemoRunning(false);
    }
  }

  async function handleGenerateAssessment() {
    setCommanderLoading(true);
    try {
      setCommanderAssessment(await getCommanderAssessment());
      setRightPanelTab("commander");
    } catch {
      setError("Unable to generate commander assessment. Check backend logs.");
    } finally {
      setCommanderLoading(false);
    }
  }

  async function handleEndScenario() {
    setResponsePending(true);
    try {
      const result = await endScenario("contained");
      setActiveScenarioStatus(result.status);
      setThreatEvents((current) => [result.event, ...current].slice(0, 20));
      setThreats([]);
      setRightPanelTab("debrief");
    } catch {
      setError("Unable to end scenario. Check backend logs.");
    } finally {
      setResponsePending(false);
    }
  }

  async function handleResetScenario() {
    setResponsePending(true);
    try {
      const result = await resetScenario();
      setActiveScenarioId(null);
      setActiveScenarioStatus(result.status);
      setThreats([]);
      setThreatEvents([result.event]);
      setLastResponseResult(null);
      setCommanderAssessment(null);
      setOperatorNotes([]);
      setRightPanelTab("scenario");
    } catch {
      setError("Unable to reset scenario. Check backend logs.");
    } finally {
      setResponsePending(false);
    }
  }

  async function handleResponseAction(action: ResponseAction) {
    setResponsePending(true);
    try {
      const result = await applyResponseAction(action, responseTargetId);
      setLastResponseResult(result);
      setThreatEvents((current) => [result.event, ...current].slice(0, 20));
    } catch {
      setError("Unable to apply response action. Check backend logs.");
    } finally {
      setResponsePending(false);
    }
  }

  async function handleAddOperatorNote(body: string, category: string) {
    if (!activeScenarioId) {
      setError("Start a scenario before recording operator notes.");
      return;
    }

    await recordScenarioNote(activeScenarioId, body, category);
  }

  async function recordScenarioNote(
    scenarioId: string,
    body: string,
    category: string,
    focusNotesTab = true,
  ) {
    try {
      const note = await addOperatorNote(scenarioId, body, category);
      setOperatorNotes((current) => [...current, note]);
      if (focusNotesTab) {
        setRightPanelTab("notes");
      }
    } catch {
      setError("Unable to save operator note. Check backend logs.");
    }
  }

  const events = useMemo(() => {
    const baseEvents = [
      "[00:00:01] Command center initialized in simulation mode.",
      "[00:00:02] Loaded 5 tracked satellites from mock telemetry API.",
      `[00:00:03] Telemetry stream ${connectionStatus}.`,
      "[00:00:04] Passive defensive monitoring active. No offensive systems configured.",
    ];

    const combinedEvents = [...baseEvents, ...threatEvents];
    const conjunctionEvents = conjunctions.slice(0, 3).map(
      (alert) =>
        `[CONJUNCTION] ${alert.satellite_name} near ${alert.debris_name}: ${alert.estimated_distance_km.toFixed(2)} km miss distance. ${alert.recommendation}`,
    );
    const allEvents = [...combinedEvents, ...conjunctionEvents];

    if (selectedSatellite) {
      return [
        ...allEvents,
        `[00:00:05] ${selectedSatellite.name} selected. Telemetry panel synchronized.`,
      ];
    }

    return allEvents;
  }, [conjunctions, connectionStatus, selectedSatellite, threatEvents]);

  return (
    <main className="grid h-screen grid-cols-[280px_minmax(0,1fr)_320px] grid-rows-[minmax(0,1fr)_176px] bg-console-bg text-slate-100">
      <SatelliteList
        satellites={satellites}
        selectedSatelliteId={selectedSatelliteId}
        onSelectSatellite={(satellite) => setSelectedSatelliteId(satellite.id)}
      />
      <div className="relative h-full min-h-0">
        {error ? (
          <div className="absolute left-1/2 top-6 z-30 -translate-x-1/2 border border-console-red bg-red-950/90 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        <ConnectionIndicator status={connectionStatus} />
        <MissionFlow
          hasScenario={Boolean(activeScenarioId)}
          hasThreat={threats.length > 0}
          hasAssessment={Boolean(commanderAssessment)}
          hasResponse={Boolean(lastResponseResult) || Boolean(activeScenarioStatus && activeScenarioStatus !== "running")}
        />
        <DemoRunPanel
          activeScenarioId={activeScenarioId}
          activeScenarioStatus={activeScenarioStatus}
          demoRunning={demoRunning}
          demoStep={demoStep}
          onRunDemo={handleRunGuidedDemo}
        />
        <a
          className="absolute right-4 top-16 z-20 border border-console-line bg-console-panel/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 hover:border-console-cyan hover:text-console-cyan"
          href="/replay"
        >
          Replay
        </a>
        <CesiumGlobe
          satellites={satellites}
          selectedSatelliteId={selectedSatelliteId}
          threats={threats}
          debris={debris}
          conjunctions={conjunctions}
          onSelectSatellite={(satellite) => {
            setSelectedSatelliteId(satellite.id);
            setRightPanelTab("telemetry");
          }}
          onSelectDebris={() => setRightPanelTab("collision")}
        />
      </div>
      <div className="flex min-h-0 flex-col border-l border-console-line bg-console-panel/95">
        <nav className="grid grid-cols-2 border-b border-console-line">
          {RIGHT_PANEL_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`border-r border-console-line px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition last:border-r-0 ${
                rightPanelTab === tab.id
                  ? "bg-cyan-400/10 text-console-cyan"
                  : "text-slate-400 hover:text-slate-100"
              }`}
              type="button"
              onClick={() => setRightPanelTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {rightPanelTab === "readiness" ? (
            <MissionReadinessPanel
              activeScenarioId={activeScenarioId}
              activeScenarioStatus={activeScenarioStatus}
              connectionStatus={connectionStatus}
              conjunctionCount={conjunctions.length}
              demoRunning={demoRunning}
              hasAssessment={Boolean(commanderAssessment)}
              hasResponse={Boolean(lastResponseResult) || Boolean(activeScenarioStatus && activeScenarioStatus !== "running")}
              onGenerateAssessment={handleGenerateAssessment}
              onOpenCommander={() => setRightPanelTab("commander")}
              onOpenScenario={() => setRightPanelTab("scenario")}
              onRunDemo={handleRunGuidedDemo}
              satelliteCount={satellites.length}
              scenarioCount={scenarios.length}
              threatCount={threats.length}
            />
          ) : null}
          {rightPanelTab === "telemetry" ? <TelemetryPanel satellite={selectedSatellite} /> : null}
          {rightPanelTab === "scenario" ? (
            <ThreatPanel
              threats={threats}
              activeScenarioId={activeScenarioId}
              activeScenarioStatus={activeScenarioStatus}
              lastResponseResult={lastResponseResult}
              scenarios={scenarios}
              selectedScenarioName={selectedScenarioName}
              scenarioStarting={scenarioStarting}
              onStartScenario={handleStartScenario}
              onEndScenario={handleEndScenario}
              onResetScenario={handleResetScenario}
              onScenarioChange={setSelectedScenarioName}
              onResponseAction={handleResponseAction}
              responsePending={responsePending}
              responseTargetName={responseTargetName}
            />
          ) : null}
          {rightPanelTab === "collision" ? <CollisionRiskPanel conjunctions={conjunctions} /> : null}
          {rightPanelTab === "debrief" ? (
            <MissionDebriefPanel
              activeScenarioId={activeScenarioId}
              activeScenarioStatus={activeScenarioStatus}
              assessment={commanderAssessment}
              conjunctions={conjunctions}
              lastResponseResult={lastResponseResult}
              notes={operatorNotes}
              selectedSatellite={selectedSatellite}
              threats={threats}
            />
          ) : null}
          {rightPanelTab === "notes" ? (
            <div className="p-4">
              <OperatorNotesPanel
                activeScenarioId={activeScenarioId}
                disabled={demoRunning || scenarioStarting}
                notes={operatorNotes}
                onAddNote={handleAddOperatorNote}
              />
            </div>
          ) : null}
          {rightPanelTab === "commander" ? (
            <CommanderPanel
              assessment={commanderAssessment}
              lastResponseResult={lastResponseResult}
              loading={commanderLoading}
              onGenerateAssessment={handleGenerateAssessment}
              onResponseAction={handleResponseAction}
              responsePending={responsePending}
              responseTargetName={responseTargetName}
            />
          ) : null}
        </div>
      </div>
      <div className="col-span-3">
        <EventLog events={events} />
      </div>
    </main>
  );
}

type DemoRunPanelProps = {
  activeScenarioId: string | null;
  activeScenarioStatus: string | null;
  demoRunning: boolean;
  demoStep: string;
  onRunDemo: () => void;
};

function DemoRunPanel({
  activeScenarioId,
  activeScenarioStatus,
  demoRunning,
  demoStep,
  onRunDemo,
}: DemoRunPanelProps) {
  const completed = Boolean(activeScenarioId && activeScenarioStatus && activeScenarioStatus !== "running");

  return (
    <section className="absolute left-4 top-24 z-20 w-[280px] border border-console-line bg-console-panel/90 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Demo Run
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{demoStep}</p>
        </div>
        {activeScenarioStatus ? (
          <span className="border border-console-cyan/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-console-cyan">
            {activeScenarioStatus}
          </span>
        ) : null}
      </div>
      <button
        className="mt-3 w-full border border-console-cyan px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-console-cyan hover:bg-cyan-400/10 disabled:cursor-wait disabled:opacity-60"
        type="button"
        disabled={demoRunning}
        onClick={onRunDemo}
      >
        {demoRunning ? "Running" : "Run Guided Demo"}
      </button>
      {completed ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            className="border border-console-line px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-console-cyan hover:text-console-cyan"
            href="/replay"
          >
            Replay
          </a>
          <a
            className="border border-console-line px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-console-amber hover:text-console-amber"
            href={`/report/${activeScenarioId}`}
          >
            Report
          </a>
        </div>
      ) : null}
    </section>
  );
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
