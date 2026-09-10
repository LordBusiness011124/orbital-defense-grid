"use client";

import type { Satellite } from "@/lib/types";

type SatelliteListProps = {
  satellites: Satellite[];
  selectedSatelliteId: string | null;
  onSelectSatellite: (satellite: Satellite) => void;
  variant?: "sidebar" | "section";
};

export function SatelliteList({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
  variant = "sidebar",
}: SatelliteListProps) {
  const sectionMode = variant === "section";

  return (
    <aside
      className={
        sectionMode
          ? "shrink-0 border-b border-console-line bg-console-panel/95"
          : "flex min-h-0 flex-col border-r border-console-line bg-console-panel/95"
      }
    >
      <div className="border-b border-console-line px-4 py-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Satellite Network</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Tracked Assets</h2>
      </div>
      <div className={sectionMode ? "max-h-72 overflow-y-auto p-3" : "min-h-0 flex-1 overflow-y-auto p-3"}>
        {satellites.map((satellite) => {
          const selected = satellite.id === selectedSatelliteId;
          return (
            <button
              key={satellite.id}
              className={`mb-2 w-full border p-3 text-left transition ${
                selected
                  ? "border-console-cyan bg-cyan-400/10"
                  : "border-console-line bg-slate-950/40 hover:border-slate-500"
              }`}
              type="button"
              onClick={() => onSelectSatellite(satellite)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-100">{satellite.name}</span>
                <span
                  className={`text-xs font-semibold uppercase ${
                    satellite.risk_score > 40 ? "text-console-amber" : "text-console-green"
                  }`}
                >
                  {satellite.health}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{satellite.status}</span>
                <span>Risk {satellite.risk_score}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
