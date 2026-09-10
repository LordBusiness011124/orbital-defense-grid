"use client";

import type { ConnectionStatus } from "@/lib/types";

type MissionReadinessPanelProps = {
  activeScenarioId: string | null;
  activeScenarioStatus: string | null;
  connectionStatus: ConnectionStatus;
  conjunctionCount: number;
  demoRunning: boolean;
  hasAssessment: boolean;
  hasResponse: boolean;
  satelliteCount: number;
  scenarioCount: number;
  threatCount: number;
  onGenerateAssessment: () => void;
  onOpenCommander: () => void;
  onOpenScenario: () => void;
  onRunDemo: () => void;
};

type ReadinessItem = {
  complete: boolean;
  label: string;
  value: string;
};

export function MissionReadinessPanel({
  activeScenarioId,
  activeScenarioStatus,
  connectionStatus,
  conjunctionCount,
  demoRunning,
  hasAssessment,
  hasResponse,
  onGenerateAssessment,
  onOpenCommander,
  onOpenScenario,
  onRunDemo,
  satelliteCount,
  scenarioCount,
  threatCount,
}: MissionReadinessPanelProps) {
  const checks: ReadinessItem[] = [
    {
      complete: connectionStatus === "connected",
      label: "Telemetry Stream",
      value: connectionStatus,
    },
    {
      complete: satelliteCount >= 5,
      label: "Tracked Assets",
      value: `${satelliteCount} satellites`,
    },
    {
      complete: scenarioCount > 0,
      label: "Scenario Library",
      value: `${scenarioCount} scenarios`,
    },
    {
      complete: Boolean(activeScenarioId),
      label: "Scenario Run",
      value: activeScenarioStatus ?? "not started",
    },
    {
      complete: threatCount > 0 || Boolean(activeScenarioStatus && activeScenarioStatus !== "running"),
      label: "Threat Evidence",
      value: threatCount ? `${threatCount} active` : "none active",
    },
    {
      complete: conjunctionCount > 0,
      label: "Collision Risk",
      value: conjunctionCount ? `${conjunctionCount} alert(s)` : "clear",
    },
    {
      complete: hasAssessment,
      label: "Commander Assessment",
      value: hasAssessment ? "generated" : "pending",
    },
    {
      complete: hasResponse,
      label: "Response Actions",
      value: hasResponse ? "recorded" : "pending",
    },
  ];
  const completeCount = checks.filter((check) => check.complete).length;
  const readinessScore = Math.round((completeCount / checks.length) * 100);
  const nextAction = getNextAction(checks);

  return (
    <section className="border-t border-console-line bg-console-panel/95">
      <div className="border-b border-console-line px-4 py-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mission Readiness</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">{readinessScore}%</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-console-cyan">
            {completeCount}/{checks.length} online
          </span>
        </div>
        <div className="mt-3 h-2 border border-console-line bg-slate-950">
          <div className="h-full bg-console-cyan" style={{ width: `${readinessScore}%` }} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="border border-console-line bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Next Action</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">{nextAction}</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between gap-3 border border-console-line bg-slate-950/40 p-2"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">{check.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">{check.value}</p>
              </div>
              <span
                className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  check.complete
                    ? "border-console-green/60 text-console-green"
                    : "border-console-amber/60 text-console-amber"
                }`}
              >
                {check.complete ? "Ready" : "Open"}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="border border-console-cyan px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-console-cyan hover:bg-cyan-400/10 disabled:cursor-wait disabled:opacity-60"
            type="button"
            disabled={demoRunning}
            onClick={onRunDemo}
          >
            {demoRunning ? "Running" : "Guided Demo"}
          </button>
          <button
            className="border border-console-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-console-cyan hover:text-console-cyan"
            type="button"
            onClick={onOpenScenario}
          >
            Scenario
          </button>
          <button
            className="border border-console-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-console-cyan hover:text-console-cyan"
            type="button"
            onClick={onGenerateAssessment}
          >
            Assess
          </button>
          <button
            className="border border-console-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-console-cyan hover:text-console-cyan"
            type="button"
            onClick={onOpenCommander}
          >
            Commander
          </button>
        </div>
      </div>
    </section>
  );
}

function getNextAction(checks: ReadinessItem[]): string {
  const firstOpen = checks.find((check) => !check.complete);
  if (!firstOpen) {
    return "Run is demo-ready. Review replay and report outputs.";
  }

  const actions: Record<string, string> = {
    "Telemetry Stream": "Start the backend and confirm the WebSocket is connected.",
    "Tracked Assets": "Load satellite telemetry from the backend.",
    "Scenario Library": "Load the simulated scenario library.",
    "Scenario Run": "Start a scenario or run the guided demo.",
    "Threat Evidence": "Let the scenario progress until threat evidence appears.",
    "Collision Risk": "Monitor conjunction alerts while the debris engine runs.",
    "Commander Assessment": "Generate a mission commander assessment.",
    "Response Actions": "Apply a defensive response action and review the result.",
  };

  return actions[firstOpen.label] ?? "Continue the mission flow.";
}
