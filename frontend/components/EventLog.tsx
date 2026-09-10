import type { EventLogEntry } from "@/lib/types";

type DisplayEvent = EventLogEntry | string;

type EventLogProps = {
  events: DisplayEvent[];
};

function eventContent(event: DisplayEvent) {
  if (typeof event === "string") {
    return {
      id: event,
      level: "info",
      text: event,
    };
  }

  const timestamp = new Date(event.timestamp).toLocaleTimeString();
  return {
    id: event.id,
    level: event.level,
    text: `[${timestamp}] ${event.source}: ${event.message}`,
  };
}

export function EventLog({ events }: EventLogProps) {
  return (
    <section className="h-44 border-t border-console-line bg-console-panel">
      <div className="flex items-center justify-between border-b border-console-line px-4 py-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Event Log
        </h2>
        <span className="text-xs text-console-green">SIMULATED</span>
      </div>
      <div className="h-[calc(100%-38px)] overflow-y-auto px-4 py-3 font-mono text-xs text-slate-300">
        {events.map((event, index) => {
          const content = eventContent(event);
          const alertStyle =
            content.level === "critical"
              ? "border-l-2 border-console-red bg-red-950/30 px-2 py-1 text-red-100"
              : content.level === "warning"
                ? "border-l-2 border-console-amber bg-amber-950/20 px-2 py-1 text-amber-100"
                : "";

          return (
            <p key={`${content.id}-${index}`} className={`mb-2 ${alertStyle}`}>
              {content.text}
            </p>
          );
        })}
      </div>
    </section>
  );
}
