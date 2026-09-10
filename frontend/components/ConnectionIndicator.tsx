import type { ConnectionStatus } from "@/lib/types";

type ConnectionIndicatorProps = {
  status: ConnectionStatus;
};

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  connected: "border-emerald-400/40 bg-emerald-400/10 text-console-green",
  reconnecting: "border-amber-400/40 bg-amber-400/10 text-console-amber",
  disconnected: "border-red-400/40 bg-red-400/10 text-console-red",
};

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  return (
    <div
      className={`pointer-events-none absolute right-4 top-4 z-20 border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[status]}`}
    >
      {status}
    </div>
  );
}
