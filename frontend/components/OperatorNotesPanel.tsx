"use client";

import { useState } from "react";
import type { OperatorNote } from "@/lib/types";

type OperatorNotesPanelProps = {
  activeScenarioId: string | null;
  disabled?: boolean;
  notes: OperatorNote[];
  onAddNote: (body: string, category: string) => Promise<void>;
};

const NOTE_CATEGORIES = ["observation", "decision", "handoff", "evidence"];

export function OperatorNotesPanel({
  activeScenarioId,
  disabled = false,
  notes,
  onAddNote,
}: OperatorNotesPanelProps) {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("observation");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed || !activeScenarioId) {
      return;
    }

    setSaving(true);
    try {
      await onAddNote(trimmed, category);
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-console-line bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Operator Notes</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{notes.length} recorded</p>
        </div>
        <span className="border border-console-line px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Audit
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <select
          className="border border-console-line bg-console-bg px-2 py-2 text-xs text-slate-100 outline-none focus:border-console-cyan"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {NOTE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button
          className="border border-console-cyan px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-console-cyan hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={!activeScenarioId || disabled || saving || !body.trim()}
          onClick={handleSubmit}
        >
          {saving ? "Saving" : "Add"}
        </button>
      </div>

      <textarea
        className="mt-2 min-h-24 w-full resize-none border border-console-line bg-console-bg p-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-console-cyan disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!activeScenarioId || disabled || saving}
        maxLength={2000}
        placeholder={activeScenarioId ? "Record operator observation, decision, or evidence..." : "Start a scenario to record notes."}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />

      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {notes.slice().reverse().map((note) => (
          <div key={note.id} className="border border-console-line bg-console-panel p-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-console-amber">
                {note.category}
              </span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                {note.elapsed_seconds === null ? "manual" : `t+${note.elapsed_seconds.toFixed(1)}s`}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-200">{note.body}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-slate-500">
              {note.author}
            </p>
          </div>
        ))}
        {!notes.length ? (
          <p className="border border-console-line bg-console-panel p-3 text-sm text-slate-400">
            No operator notes recorded yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
