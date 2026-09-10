"use client";

import { useEffect, useMemo, useState } from "react";
import { CesiumGlobe } from "@/components/CesiumGlobe";
import { CollisionRiskPanel } from "@/components/CollisionRiskPanel";
import { EventLog } from "@/components/EventLog";
import { SatelliteList } from "@/components/SatelliteList";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { getScenarioReplay, getScenarios } from "@/lib/api";
import type {
  ConjunctionAlert,
  DebrisObject,
  EventLogEntry,
  OperatorNote,
  ReplayFrame,
  Satellite,
  ScenarioReplay,
  ScenarioRunSummary,
  Threat,
} from "@/lib/types";

function snapshotFrames(replay: ScenarioReplay | null) {
  return replay?.timeline.filter((frame) => frame.kind === "snapshot") ?? [];
}

const REPLAY_SPEEDS = [1, 2, 4];

export default function ReplayPage() {
  const [scenarios, setScenarios] = useState<ScenarioRunSummary[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [replay, setReplay] = useState<ScenarioReplay | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    getScenarios()
      .then((data) => {
        setScenarios(data);
        setSelectedScenarioId(data[0]?.id ?? null);
      })
      .catch(() => setError("Unable to load scenario runs."));
  }, []);

  useEffect(() => {
    if (!selectedScenarioId) {
      return;
    }

    getScenarioReplay(selectedScenarioId)
      .then((data) => {
        setReplay(data);
        setFrameIndex(0);
        setPlaying(false);
        const firstSnapshot = snapshotFrames(data)[0];
        setSelectedSatelliteId(firstSnapshot?.payload.satellites?.[0]?.id ?? null);
      })
      .catch(() => setError("Unable to load replay timeline."));
  }, [selectedScenarioId]);

  const frames = useMemo(() => snapshotFrames(replay), [replay]);
  const activeFrame: ReplayFrame | null = frames[frameIndex] ?? null;
  const activeElapsedSeconds = activeFrame?.elapsed_seconds ?? 0;
  const satellites: Satellite[] = activeFrame?.payload.satellites ?? [];
  const threats: Threat[] = activeFrame?.payload.threats ?? [];
  const debris: DebrisObject[] = activeFrame?.payload.debris ?? [];
  const conjunctions: ConjunctionAlert[] = activeFrame?.payload.conjunctions ?? [];
  const selectedSatellite = useMemo(
    () => satellites.find((satellite) => satellite.id === selectedSatelliteId) ?? satellites[0] ?? null,
    [satellites, selectedSatelliteId],
  );
  const eventFrames = useMemo(
    () => replay?.timeline.filter((frame) => frame.kind !== "snapshot") ?? [],
    [replay],
  );
  const visibleEventFrames = eventFrames.filter(
    (frame) => frame.elapsed_seconds <= activeElapsedSeconds,
  );
  const timelineMarkers = useMemo(() => {
    const maxElapsed = frames.at(-1)?.elapsed_seconds ?? 0;
    if (!maxElapsed) {
      return [];
    }

    return eventFrames.map((frame) => ({
      id: `${frame.kind}-${frame.id}`,
      kind: frame.kind,
      elapsedSeconds: frame.elapsed_seconds,
      left: Math.max(0, Math.min(100, (frame.elapsed_seconds / maxElapsed) * 100)),
      label: markerLabel(frame),
    }));
  }, [eventFrames, frames]);
  const events: Array<EventLogEntry | string> = useMemo(() => {
    const seen = new Set<string>();
    const deduped: Array<EventLogEntry | string> = [];

    const append = (event: EventLogEntry | string) => {
      const id = typeof event === "string" ? event : event.id;
      if (seen.has(id)) {
        return;
      }

      seen.add(id);
      deduped.push(event);
    };

    (activeFrame?.payload.events ?? []).forEach(append);
    visibleEventFrames.forEach((frame) => {
      if (frame.payload.event) {
        append(frame.payload.event);
        return;
      }
      if (frame.payload.response) {
        append(frame.payload.response.event);
        return;
      }
      append(`[REPLAY] ${frame.kind} at ${frame.elapsed_seconds.toFixed(1)}s`);
    });

    return deduped;
  }, [activeFrame, visibleEventFrames]);
  const activeScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
  const operatorNotes = replay?.notes ?? [];

  useEffect(() => {
    if (!playing || frames.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setFrameIndex((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, Math.max(180, 900 / speed));

    return () => clearInterval(interval);
  }, [frames.length, playing, speed]);

  return (
    <main className="grid h-screen grid-cols-[280px_minmax(0,1fr)_340px] grid-rows-[minmax(0,1fr)_176px] bg-console-bg text-slate-100">
      <aside className="flex min-h-0 flex-col border-r border-console-line bg-console-panel/95">
        <div className="border-b border-console-line px-4 py-3">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Replay Mode</p>
          <h1 className="mt-1 text-lg font-semibold text-white">Scenario Runs</h1>
          <a className="mt-2 inline-block text-xs uppercase tracking-[0.16em] text-console-cyan" href="/">
            Dashboard
          </a>
          {selectedScenarioId ? (
            <a
              className="ml-4 mt-2 inline-block text-xs uppercase tracking-[0.16em] text-console-amber"
              href={`/report/${selectedScenarioId}`}
            >
              Generate Report
            </a>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              className={`mb-2 w-full border p-3 text-left ${
                scenario.id === selectedScenarioId
                  ? "border-console-cyan bg-cyan-400/10"
                  : "border-console-line bg-slate-950/40"
              }`}
              type="button"
              onClick={() => setSelectedScenarioId(scenario.id)}
            >
              <p className="font-semibold text-slate-100">{scenario.name}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(scenario.started_at).toLocaleString()}</p>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">{scenario.frame_count} frames</span>
                <span className="uppercase tracking-[0.12em] text-console-cyan">{scenario.status}</span>
              </div>
            </button>
          ))}
          {!scenarios.length ? <p className="text-sm text-slate-400">No scenario runs recorded yet.</p> : null}
        </div>
      </aside>

      <div className="relative h-full min-h-0">
        {error ? (
          <div className="absolute left-1/2 top-6 z-30 -translate-x-1/2 border border-console-red bg-red-950/90 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        <CesiumGlobe
          satellites={satellites}
          selectedSatelliteId={selectedSatellite?.id ?? null}
          threats={threats}
          debris={debris}
          conjunctions={conjunctions}
          onSelectSatellite={(satellite) => setSelectedSatelliteId(satellite.id)}
          onSelectDebris={() => setPlaying(false)}
        />
        <div className="absolute bottom-4 left-4 right-4 z-20 border border-console-line bg-console-panel/90 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                t+{activeElapsedSeconds.toFixed(1)}s
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {activeScenario?.name ?? "No scenario selected"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="border border-console-cyan px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-console-cyan hover:bg-cyan-400/10 disabled:opacity-50"
                type="button"
                disabled={frames.length <= 1}
                onClick={() => setPlaying((current) => !current)}
              >
                {playing ? "Pause" : "Play"}
              </button>
              {REPLAY_SPEEDS.map((item) => (
                <button
                  key={item}
                  className={`border px-2 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                    speed === item
                      ? "border-console-amber text-console-amber"
                      : "border-console-line text-slate-400 hover:text-slate-100"
                  }`}
                  type="button"
                  onClick={() => setSpeed(item)}
                >
                  {item}x
                </button>
              ))}
              <span className="ml-2 text-xs text-slate-400">
                Frame {frames.length ? frameIndex + 1 : 0} / {frames.length}
              </span>
            </div>
          </div>
          <div className="relative mt-3 h-5">
            <div className="absolute left-0 right-0 top-2 h-px bg-console-line" />
            {timelineMarkers.map((marker) => (
              <button
                key={marker.id}
                className={`absolute top-0 h-5 w-2 -translate-x-1/2 border ${
                  marker.kind === "response_action"
                    ? "border-console-green bg-emerald-300"
                    : "border-console-amber bg-amber-300"
                }`}
                style={{ left: `${marker.left}%` }}
                title={marker.label}
                type="button"
                onClick={() => {
                  const targetIndex = nearestFrameIndex(frames, marker.elapsedSeconds);
                  setFrameIndex(targetIndex);
                  setPlaying(false);
                }}
              />
            ))}
          </div>
          <input
            className="mt-3 w-full"
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={frameIndex}
            onChange={(event) => setFrameIndex(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-y-auto border-l border-console-line bg-console-panel/95">
        <TelemetryPanel satellite={selectedSatellite} variant="section" />
        <ReplayInspector
          activeElapsedSeconds={activeElapsedSeconds}
          activeScenario={activeScenario}
          conjunctionCount={conjunctions.length}
          eventFrames={eventFrames}
          frameCount={frames.length}
          frameIndex={frameIndex}
          onJumpToFrame={(elapsedSeconds) => {
            setFrameIndex(nearestFrameIndex(frames, elapsedSeconds));
            setPlaying(false);
          }}
          operatorNotes={operatorNotes}
          responseCount={eventFrames.filter((frame) => frame.kind === "response_action").length}
          threatCount={threats.length}
          visibleEventCount={visibleEventFrames.length}
        />
        <SatelliteList
          satellites={satellites}
          selectedSatelliteId={selectedSatellite?.id ?? null}
          onSelectSatellite={(satellite) => setSelectedSatelliteId(satellite.id)}
          variant="section"
        />
        <CollisionRiskPanel conjunctions={conjunctions} />
      </div>

      <div className="col-span-3">
        <EventLog events={events} />
      </div>
    </main>
  );
}

type ReplayInspectorProps = {
  activeElapsedSeconds: number;
  activeScenario: ScenarioRunSummary | null;
  conjunctionCount: number;
  eventFrames: ReplayFrame[];
  frameCount: number;
  frameIndex: number;
  onJumpToFrame: (elapsedSeconds: number) => void;
  operatorNotes: OperatorNote[];
  responseCount: number;
  threatCount: number;
  visibleEventCount: number;
};

function ReplayInspector({
  activeElapsedSeconds,
  activeScenario,
  conjunctionCount,
  eventFrames,
  frameCount,
  frameIndex,
  onJumpToFrame,
  operatorNotes,
  responseCount,
  threatCount,
  visibleEventCount,
}: ReplayInspectorProps) {
  const keyFrames = eventFrames.slice(0, 8);

  return (
    <section className="border-b border-console-line px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Investigation</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {activeScenario?.status ?? "No Run"}
          </h2>
        </div>
        <span className="border border-console-cyan/60 px-2 py-1 text-xs font-semibold text-console-cyan">
          t+{activeElapsedSeconds.toFixed(1)}s
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <ReplayMetric label="Frame" value={`${frameCount ? frameIndex + 1 : 0}/${frameCount}`} />
        <ReplayMetric label="Events Seen" value={visibleEventCount.toString()} />
        <ReplayMetric label="Threats" value={threatCount.toString()} />
        <ReplayMetric label="Responses" value={responseCount.toString()} />
        <ReplayMetric label="Conjunctions" value={conjunctionCount.toString()} />
        <ReplayMetric label="Notes" value={operatorNotes.length.toString()} />
        <ReplayMetric label="Run" value={activeScenario ? activeScenario.name : "None"} />
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Key Moments</p>
        <div className="mt-2 space-y-2">
          {keyFrames.map((frame) => (
            <button
              key={`${frame.kind}-${frame.id}`}
              className="w-full border border-console-line bg-slate-950/40 p-2 text-left hover:border-console-cyan"
              type="button"
              onClick={() => onJumpToFrame(frame.elapsed_seconds)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-console-amber">
                  t+{frame.elapsed_seconds.toFixed(1)}s
                </span>
                <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  {frame.kind.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 max-h-10 overflow-hidden text-sm text-slate-200">{markerLabel(frame)}</p>
            </button>
          ))}
          {!keyFrames.length ? (
            <p className="border border-console-line bg-slate-950/40 p-3 text-sm text-slate-400">
              No incident events recorded for this run yet.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Operator Notes</p>
        <div className="mt-2 space-y-2">
          {operatorNotes.slice().reverse().slice(0, 4).map((note) => (
            <div key={note.id} className="border border-console-line bg-slate-950/40 p-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-console-amber">
                  {note.category}
                </span>
                <span className="text-xs uppercase tracking-[0.1em] text-slate-500">
                  {note.elapsed_seconds === null ? "manual" : `t+${note.elapsed_seconds.toFixed(1)}s`}
                </span>
              </div>
              <p className="mt-1 max-h-16 overflow-hidden text-sm text-slate-200">{note.body}</p>
            </div>
          ))}
          {!operatorNotes.length ? (
            <p className="border border-console-line bg-slate-950/40 p-3 text-sm text-slate-400">
              No operator notes were saved with this scenario.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReplayMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-console-line bg-slate-950/40 p-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-100" title={value}>
        {value}
      </p>
    </div>
  );
}

function markerLabel(frame: ReplayFrame): string {
  if (frame.payload.event) {
    return frame.payload.event.message;
  }

  if (frame.payload.response) {
    return frame.payload.response.explanation;
  }

  return `${frame.kind} at t+${frame.elapsed_seconds.toFixed(1)}s`;
}

function nearestFrameIndex(frames: ReplayFrame[], targetElapsed: number): number {
  if (!frames.length) {
    return 0;
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  frames.forEach((frame, index) => {
    const distance = Math.abs(frame.elapsed_seconds - targetElapsed);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}
