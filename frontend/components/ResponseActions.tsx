"use client";

import type { ResponseAction } from "@/lib/types";
import type { ResponseActionResult } from "@/lib/types";

type ResponseActionsProps = {
  disabled?: boolean;
  lastResult: ResponseActionResult | null;
  onAction: (action: ResponseAction) => void;
  targetName?: string | null;
};

const ACTIONS: Array<{ action: ResponseAction; label: string }> = [
  { action: "quarantine_telemetry", label: "Quarantine Telemetry" },
  { action: "switch_to_inertial_estimate", label: "Inertial Estimate" },
  { action: "block_ground_station_commands", label: "Block Commands" },
  { action: "increase_tracking_priority", label: "Track Priority" },
  { action: "request_human_review", label: "Human Review" },
  { action: "simulate_evasive_maneuver", label: "Sim Evasive" },
  { action: "safe_mode", label: "Safe Mode" },
];

export function ResponseActions({
  disabled = false,
  lastResult,
  onAction,
  targetName,
}: ResponseActionsProps) {
  return (
    <div className="mt-3 border border-console-line bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Response Simulator</p>
        {targetName ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-console-cyan">
            Target {targetName}
          </p>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ACTIONS.map((item) => (
          <button
            key={item.action}
            className="border border-console-line px-2 py-2 text-xs font-semibold text-slate-200 hover:border-console-cyan hover:text-console-cyan disabled:cursor-wait disabled:opacity-60"
            type="button"
            disabled={disabled}
            onClick={() => onAction(item.action)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {lastResult ? (
        <div className="mt-3 border border-console-line bg-console-panel p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-console-cyan">
              {lastResult.result.replace("_", " ")}
            </p>
            <p
              className={`text-xs font-semibold ${
                lastResult.risk_score_delta < 0 ? "text-console-green" : "text-slate-400"
              }`}
            >
              Risk {lastResult.risk_score_delta}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-200">{lastResult.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
