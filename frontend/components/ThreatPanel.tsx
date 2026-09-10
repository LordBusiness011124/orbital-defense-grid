"use client";

import { ResponseActions } from "@/components/ResponseActions";
import type { ResponseAction } from "@/lib/types";
import type { ResponseActionResult } from "@/lib/types";
import type { ScenarioDefinition } from "@/lib/types";
import type { Threat } from "@/lib/types";

type ThreatPanelProps = {
  threats: Threat[];
  activeScenarioId: string | null;
  activeScenarioStatus: string | null;
  lastResponseResult: ResponseActionResult | null;
  scenarios: ScenarioDefinition[];
  selectedScenarioName: string;
  onStartScenario: () => void;
  onEndScenario: () => void;
  onResetScenario: () => void;
  onScenarioChange: (name: string) => void;
  onResponseAction: (action: ResponseAction) => void;
  responsePending: boolean;
  scenarioStarting: boolean;
  responseTargetName: string | null;
};

export function ThreatPanel({
  threats,
  activeScenarioId,
  activeScenarioStatus,
  lastResponseResult,
  scenarios,
  selectedScenarioName,
  onStartScenario,
  onEndScenario,
  onResetScenario,
  onScenarioChange,
  onResponseAction,
  responsePending,
  responseTargetName,
  scenarioStarting,
}: ThreatPanelProps) {
  const activeThreat = threats[0] ?? null;
  const selectedScenario =
    scenarios.find((scenario) => scenario.name === selectedScenarioName) ?? scenarios[0] ?? null;

  return (
    <section className="border-t border-console-line bg-console-panel/95">
      <div className="flex items-center justify-between border-b border-console-line px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Cyber Threats</p>
          <h2 className="mt-1 text-base font-semibold text-white">
            {activeThreat ? activeThreat.severity.toUpperCase() : "No Active Threats"}
          </h2>
        </div>
        <button
          className="border border-console-cyan px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-console-cyan hover:bg-cyan-400/10 disabled:cursor-wait disabled:opacity-60"
          type="button"
          disabled={scenarioStarting}
          onClick={onStartScenario}
        >
          Start Scenario
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div className="border border-console-line bg-slate-950/50 p-3">
          <label
            className="text-xs uppercase tracking-[0.16em] text-slate-500"
            htmlFor="scenario-select"
          >
            Scenario Library
          </label>
          <select
            className="mt-3 w-full border border-console-line bg-console-bg px-3 py-2 text-sm text-slate-100 outline-none focus:border-console-cyan"
            id="scenario-select"
            value={selectedScenarioName}
            onChange={(event) => onScenarioChange(event.target.value)}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.name} value={scenario.name}>
                {scenario.name}
              </option>
            ))}
          </select>
          {selectedScenario ? (
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>{selectedScenario.description}</p>
              <div className="flex justify-between gap-3 text-xs">
                <span className="uppercase tracking-[0.14em] text-slate-500">Affected</span>
                <span className="font-semibold text-slate-100">
                  {selectedScenario.affected_satellite_name}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs">
                <span className="uppercase tracking-[0.14em] text-slate-500">Type</span>
                <span className="font-semibold text-slate-100">{selectedScenario.threat_type}</span>
              </div>
            </div>
          ) : null}
        </div>
        {activeScenarioId ? (
          <div className="border border-console-line bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Demo Outputs</p>
            {activeScenarioStatus ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-console-cyan">
                Status {activeScenarioStatus}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                className="border border-console-line px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-console-cyan hover:text-console-cyan"
                href="/replay"
              >
                Replay
              </a>
              <a
                className="border border-console-line px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-console-amber hover:text-console-amber"
                href={`/report/${activeScenarioId}`}
              >
                Report
              </a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="border border-console-green/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-console-green hover:bg-emerald-400/10 disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={responsePending}
                onClick={onEndScenario}
              >
                End Scenario
              </button>
              <button
                className="border border-console-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 hover:border-console-amber hover:text-console-amber disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={responsePending}
                onClick={onResetScenario}
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}
        {activeThreat ? (
          <div className="border border-console-red bg-red-950/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-red-100">{activeThreat.name}</h3>
              <span className="text-xs font-semibold uppercase text-console-red">
                {activeThreat.confidence}% confidence
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{activeThreat.description}</p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="uppercase tracking-[0.14em] text-slate-500">Affected</dt>
                <dd className="text-slate-100">{activeThreat.affected_satellite_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="uppercase tracking-[0.14em] text-slate-500">Type</dt>
                <dd className="text-slate-100">{activeThreat.type}</dd>
              </div>
            </dl>
            <div className="mt-3 border border-console-line bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Recommended Response</p>
              <p className="mt-1 text-sm text-slate-100">{activeThreat.recommended_response}</p>
            </div>
            <ResponseActions
              disabled={responsePending}
              lastResult={lastResponseResult}
              onAction={onResponseAction}
              targetName={responseTargetName}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Start the telemetry spoofing scenario to inject simulated ORION-3 anomalies.
          </p>
        )}
      </div>
    </section>
  );
}
