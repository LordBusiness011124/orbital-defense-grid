"use client";

type MissionFlowProps = {
  hasScenario: boolean;
  hasThreat: boolean;
  hasAssessment: boolean;
  hasResponse: boolean;
};

const STEPS = [
  "Monitor",
  "Inject Scenario",
  "Assess",
  "Respond",
  "Replay / Report",
];

export function MissionFlow({
  hasScenario,
  hasThreat,
  hasAssessment,
  hasResponse,
}: MissionFlowProps) {
  const activeIndex = getActiveIndex(hasScenario, hasThreat, hasAssessment, hasResponse);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-[680px] border border-console-line bg-console-panel/85 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Mission Flow
        </p>
        {STEPS.map((step, index) => {
          const completed = index < activeIndex;
          const active = index === activeIndex;

          return (
            <div
              key={step}
              className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                active
                  ? "border-console-cyan bg-cyan-400/10 text-console-cyan"
                  : completed
                    ? "border-console-green/60 text-console-green"
                    : "border-console-line text-slate-500"
              }`}
            >
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getActiveIndex(
  hasScenario: boolean,
  hasThreat: boolean,
  hasAssessment: boolean,
  hasResponse: boolean,
) {
  if (!hasScenario) {
    return 1;
  }

  if (!hasThreat || !hasAssessment) {
    return 2;
  }

  if (!hasResponse) {
    return 3;
  }

  return 4;
}
