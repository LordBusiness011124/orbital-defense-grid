import type { ConjunctionAlert } from "@/lib/types";

type CollisionRiskPanelProps = {
  conjunctions: ConjunctionAlert[];
};

export function CollisionRiskPanel({ conjunctions }: CollisionRiskPanelProps) {
  const sortedAlerts = [...conjunctions].sort(
    (a, b) => a.estimated_distance_km - b.estimated_distance_km,
  );

  return (
    <section className="border-t border-console-line bg-console-panel/95">
      <div className="border-b border-console-line px-4 py-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Collision Risk</p>
        <h2 className="mt-1 text-base font-semibold text-white">
          {sortedAlerts.length ? `${sortedAlerts.length} Active Alert` : "No Active Alerts"}
        </h2>
      </div>
      <div className="max-h-64 space-y-3 overflow-y-auto p-4">
        {sortedAlerts.length ? (
          sortedAlerts.map((alert) => (
            <article key={alert.id} className="border border-console-amber bg-amber-950/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-amber-100">
                  {alert.satellite_name} / {alert.debris_name}
                </h3>
                <span className="text-xs font-semibold uppercase text-console-amber">
                  {alert.severity}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="uppercase tracking-[0.14em] text-slate-500">Miss Distance</dt>
                  <dd className="text-slate-100">{alert.estimated_distance_km.toFixed(2)} km</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="uppercase tracking-[0.14em] text-slate-500">Closest Approach</dt>
                  <dd className="text-slate-100">{alert.time_to_closest_approach_seconds}s</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-slate-200">{alert.recommendation}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-400">
            Tracking debris fields. No object is inside the 25 km alert threshold.
          </p>
        )}
      </div>
    </section>
  );
}
