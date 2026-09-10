"use client";

import type {
  CommanderAssessment,
  ConjunctionAlert,
  OperatorNote,
  ResponseActionResult,
  Satellite,
  Threat,
} from "@/lib/types";

type MissionDebriefPanelProps = {
  activeScenarioId: string | null;
  activeScenarioStatus: string | null;
  assessment: CommanderAssessment | null;
  conjunctions: ConjunctionAlert[];
  lastResponseResult: ResponseActionResult | null;
  notes: OperatorNote[];
  selectedSatellite: Satellite | null;
  threats: Threat[];
};

export function MissionDebriefPanel({
  activeScenarioId,
  activeScenarioStatus,
  assessment,
  conjunctions,
  lastResponseResult,
  notes,
  selectedSatellite,
  threats,
}: MissionDebriefPanelProps) {
  const activeThreat = threats[0] ?? null;
  const riskScore = selectedSatellite?.risk_score ?? null;
  const contained = activeScenarioStatus === "contained" || activeScenarioStatus === "resolved";
  const failed = activeScenarioStatus === "failed";
  const actionEffective = Boolean(lastResponseResult && lastResponseResult.risk_score_delta < 0);

  return (
    <section className="border-t border-console-line bg-console-panel/95">
      <div className="border-b border-console-line px-4 py-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mission Debrief</p>
        <h2 className="mt-1 text-base font-semibold text-white">
          {contained ? "Incident Contained" : failed ? "Incident Failed" : activeThreat ? "Incident Active" : "Standing By"}
        </h2>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <DebriefMetric
            label="Status"
            value={activeScenarioStatus ?? "none"}
            tone={contained ? "green" : failed ? "amber" : "cyan"}
          />
          <DebriefMetric
            label="Risk"
            value={riskScore === null ? "--" : `${riskScore}/100`}
            tone={riskScore && riskScore >= 70 ? "amber" : "green"}
          />
          <DebriefMetric
            label="Threats"
            value={threats.length.toString()}
            tone={threats.length ? "amber" : "green"}
          />
          <DebriefMetric
            label="Conjunctions"
            value={conjunctions.length.toString()}
            tone={conjunctions.length ? "amber" : "green"}
          />
        </div>

        <div className="border border-console-line bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Assessment</p>
          <p className="mt-2 text-sm text-slate-100">
            {assessment?.summary ??
              "Generate a commander assessment during a scenario to populate the incident debrief."}
          </p>
          {assessment ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="uppercase tracking-[0.14em] text-slate-500">Confidence</span>
              <span className="font-semibold text-console-cyan">{assessment.confidence}%</span>
            </div>
          ) : null}
        </div>

        <div className="border border-console-line bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Last Response</p>
          {lastResponseResult ? (
            <>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-100">
                  {lastResponseResult.action.replaceAll("_", " ")}
                </p>
                <span className={actionEffective ? "text-console-green" : "text-console-amber"}>
                  Risk {lastResponseResult.risk_score_delta}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{lastResponseResult.explanation}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No response action has been recorded for the active run.
            </p>
          )}
        </div>

        <div className="border border-console-line bg-slate-950/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Operator Notes</p>
            <span className="text-xs font-semibold text-console-cyan">{notes.length}</span>
          </div>
          {notes.length ? (
            <p className="mt-2 text-sm text-slate-200">{notes[notes.length - 1].body}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              Add operator notes to preserve decisions and evidence in the report.
            </p>
          )}
        </div>

        <div className="border border-console-amber bg-amber-950/20 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Closeout</p>
          <ul className="mt-2 space-y-2 text-sm text-amber-50">
            <li>
              {contained
                ? "Scenario is closed and ready for replay/report review."
                : "Contain or reset the active scenario before final report review."}
            </li>
            <li>{activeThreat ? activeThreat.recommended_response : "Continue passive monitoring and validate telemetry stream health."}</li>
            <li>Preserve timeline data for incident review.</li>
          </ul>
        </div>

        {activeScenarioId ? (
          <div className="grid grid-cols-2 gap-2">
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
        ) : null}
      </div>
    </section>
  );
}

function DebriefMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "amber" | "cyan" | "green";
  value: string;
}) {
  const toneClass = {
    amber: "text-console-amber",
    cyan: "text-console-cyan",
    green: "text-console-green",
  }[tone];

  return (
    <div className="border border-console-line bg-slate-950/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold uppercase ${toneClass}`} title={value}>
        {value}
      </p>
    </div>
  );
}
