"use client";

import type { Satellite } from "@/lib/types";

type TelemetryPanelProps = {
  satellite: Satellite | null;
  variant?: "panel" | "section";
};

export function TelemetryPanel({ satellite, variant = "panel" }: TelemetryPanelProps) {
  const sectionMode = variant === "section";
  const rows = satellite
    ? [
        ["Latitude", `${satellite.latitude.toFixed(2)} deg`],
        ["Longitude", `${satellite.longitude.toFixed(2)} deg`],
        ["Altitude", `${satellite.altitude_km.toFixed(1)} km`],
        ["Velocity", `${satellite.velocity_km_s.toFixed(2)} km/s`],
        ["Inclination", `${satellite.inclination.toFixed(1)} deg`],
        ["Period", `${satellite.orbital_period_minutes.toFixed(1)} min`],
        ["Phase", `${satellite.phase.toFixed(1)} deg`],
        ["Risk Score", `${satellite.risk_score}/100`],
        ["Status", satellite.status],
      ]
    : [];

  return (
    <aside
      className={
        sectionMode
          ? "shrink-0 border-b border-console-line bg-console-panel/95"
          : "flex min-h-0 flex-1 flex-col bg-console-panel/95"
      }
    >
      <div className="border-b border-console-line px-4 py-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Telemetry</p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          {satellite ? satellite.name : "No Satellite Selected"}
        </h2>
      </div>
      <div className={sectionMode ? "max-h-80 overflow-y-auto p-4" : "min-h-0 flex-1 overflow-y-auto p-4"}>
        {satellite ? (
          <div className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="border border-console-line bg-slate-950/50 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Select a tracked satellite to inspect telemetry.</p>
        )}
      </div>
    </aside>
  );
}
