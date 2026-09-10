"use client";

import type { Satellite } from "@/lib/types";

type GlobePlaceholderProps = {
  satellites: Satellite[];
  selectedSatelliteId: string | null;
  onSelectSatellite: (satellite: Satellite) => void;
};

function projectSatellite(satellite: Satellite, index: number) {
  const x = ((satellite.longitude + 180) / 360) * 100;
  const y = (1 - (satellite.latitude + 90) / 180) * 100;
  const radiusOffset = index % 2 === 0 ? 3 : -3;

  return {
    left: `${Math.min(88, Math.max(12, x + radiusOffset))}%`,
    top: `${Math.min(82, Math.max(18, y))}%`,
  };
}

export function GlobePlaceholder({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
}: GlobePlaceholderProps) {
  return (
    <section className="relative h-full min-h-[480px] w-full overflow-hidden bg-[#030712]">
      <div className="absolute left-4 top-4 z-10">
        <p className="text-xs uppercase tracking-[0.24em] text-console-cyan">Orbital Defense Grid</p>
        <h1 className="mt-1 max-w-xl text-2xl font-semibold text-white">
          AI-powered satellite monitoring, collision prediction, and space-cyber incident simulation
          platform.
        </h1>
      </div>

      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(103,232,249,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30 bg-[radial-gradient(circle_at_35%_30%,#1f9bd1_0%,#0f3c68_36%,#061627_68%,#020617_100%)] shadow-[0_0_70px_rgba(34,211,238,0.2)]">
        <div className="absolute inset-7 rounded-full border border-cyan-200/10" />
        <div className="absolute inset-16 rounded-full border border-cyan-200/10" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-200/10" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-200/10" />
      </div>

      {satellites.map((satellite, index) => {
        const selected = satellite.id === selectedSatelliteId;
        return (
          <button
            key={satellite.id}
            className={`absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border transition ${
              selected
                ? "border-white bg-console-amber shadow-[0_0_24px_rgba(251,191,36,0.9)]"
                : "border-cyan-100 bg-console-cyan shadow-[0_0_18px_rgba(103,232,249,0.7)]"
            }`}
            style={projectSatellite(satellite, index)}
            type="button"
            aria-label={`Select ${satellite.name}`}
            onClick={() => onSelectSatellite(satellite)}
          >
            <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-xs text-slate-100">
              {satellite.name}
            </span>
          </button>
        );
      })}
    </section>
  );
}
