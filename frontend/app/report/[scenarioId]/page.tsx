"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getScenarioReportUrl } from "@/lib/api";

export default function ReportPage() {
  const params = useParams<{ scenarioId: string }>();
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(getScenarioReportUrl(params.scenarioId), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Report unavailable");
        }
        return response.text();
      })
      .then(setHtml)
      .catch(() => setError("Unable to load incident report."));
  }, [params.scenarioId]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-console-bg text-slate-100">
        <div className="border border-console-red bg-red-950/30 p-6">{error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-slate-300 bg-slate-950 px-6 py-3 print:hidden">
        <a className="text-sm font-semibold uppercase tracking-[0.16em] text-console-cyan" href="/replay">
          Replay
        </a>
        <button
          className="ml-4 border border-console-cyan px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-console-cyan"
          type="button"
          onClick={() => window.print()}
        >
          Print / Export PDF
        </button>
      </div>
      {html ? (
        <iframe className="h-[calc(100vh-49px)] w-full print:h-screen" srcDoc={html} title="Incident Report" />
      ) : (
        <div className="p-8 text-slate-700">Loading report...</div>
      )}
    </main>
  );
}
