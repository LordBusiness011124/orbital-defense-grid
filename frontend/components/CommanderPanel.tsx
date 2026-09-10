"use client";

import { ResponseActions } from "@/components/ResponseActions";
import type { CommanderAssessment } from "@/lib/types";
import type { ResponseAction } from "@/lib/types";
import type { ResponseActionResult } from "@/lib/types";

type CommanderPanelProps = {
  assessment: CommanderAssessment | null;
  lastResponseResult: ResponseActionResult | null;
  loading: boolean;
  onGenerateAssessment: () => void;
  onResponseAction: (action: ResponseAction) => void;
  responsePending: boolean;
  responseTargetName: string | null;
};

export function CommanderPanel({
  assessment,
  lastResponseResult,
  loading,
  onGenerateAssessment,
  onResponseAction,
  responsePending,
  responseTargetName,
}: CommanderPanelProps) {
  return (
    <section className="border-t border-console-line bg-console-panel/95">
      <div className="flex items-center justify-between gap-3 border-b border-console-line px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">AI Mission Commander</p>
          <h2 className="mt-1 text-base font-semibold text-white">
            {assessment ? assessment.severity.toUpperCase() : "Assessment Ready"}
          </h2>
        </div>
        <button
          className="border border-console-cyan px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-console-cyan hover:bg-cyan-400/10 disabled:cursor-wait disabled:opacity-60"
          type="button"
          disabled={loading}
          onClick={onGenerateAssessment}
        >
          Generate
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-4">
        {assessment ? (
          <div className="space-y-3">
            <div className="border border-console-line bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Summary</p>
              <p className="mt-1 text-sm text-slate-100">{assessment.summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border border-console-line bg-slate-950/50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Confidence</p>
                <p className="mt-1 font-semibold text-console-cyan">{assessment.confidence}%</p>
              </div>
              <div className="border border-console-line bg-slate-950/50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Systems</p>
                <p className="mt-1 font-semibold text-slate-100">
                  {assessment.systems_affected.length || 0}
                </p>
              </div>
            </div>
            <div className="border border-console-line bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Likely Cause</p>
              <p className="mt-1 text-sm text-slate-100">{assessment.likely_cause}</p>
            </div>
            <div className="border border-console-amber bg-amber-950/20 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Recommended Actions
              </p>
              <ul className="mt-2 space-y-2 text-sm text-amber-50">
                {assessment.recommended_actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
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
            Generate a rule-based assessment from active threats, conjunction alerts, telemetry, and
            recent events.
          </p>
        )}
      </div>
    </section>
  );
}
