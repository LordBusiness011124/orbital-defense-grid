from __future__ import annotations

from html import escape
from typing import Any

from app.models import ScenarioReplay


def generate_incident_report(replay: ScenarioReplay) -> str:
    snapshots = [frame for frame in replay.timeline if frame.kind == "snapshot"]
    event_frames = [frame for frame in replay.timeline if frame.kind == "event"]
    response_frames = [frame for frame in replay.timeline if frame.kind == "response_action"]
    operator_notes = replay.notes
    final_snapshot = snapshots[-1].payload if snapshots else {}
    threats = latest_records(snapshots, "threats")
    conjunctions = latest_records(snapshots, "conjunctions")
    satellites = final_snapshot.get("satellites", [])
    affected_satellites = sorted(
        {
            threat.get("affected_satellite_name", "")
            for threat in threats
            if threat.get("affected_satellite_name")
        }
        | {
            alert.get("satellite_name", "")
            for alert in conjunctions
            if alert.get("satellite_name")
        }
    )

    max_severity = highest_severity(
        [threat.get("severity", "nominal") for threat in threats]
        + [alert.get("severity", "nominal") for alert in conjunctions]
    )
    affected_table = table(["Satellite"], [[name] for name in affected_satellites] or [["None recorded"]])
    threats_table = table(
        ["Name", "Type", "Severity", "Confidence", "Status"],
        [
            [
                item.get("name", ""),
                item.get("type", ""),
                item.get("severity", ""),
                f"{item.get('confidence', '')}%",
                item.get("status", ""),
            ]
            for item in threats
        ]
        or [["None", "", "", "", ""]],
    )
    conjunctions_table = table(
        ["Satellite", "Debris", "Distance", "Severity", "Recommendation"],
        [
            [
                item.get("satellite_name", ""),
                item.get("debris_name", ""),
                f"{item.get('estimated_distance_km', '')} km",
                item.get("severity", ""),
                item.get("recommendation", ""),
            ]
            for item in conjunctions
        ]
        or [["None", "", "", "", ""]],
    )
    responses_table = table(
        ["Time", "Action", "Result", "Risk Delta", "Explanation"],
        response_rows(response_frames),
    )
    notes_table = table(
        ["Time", "Category", "Author", "Note"],
        [
            [
                f"t+{note.elapsed_seconds:.1f}s" if note.elapsed_seconds is not None else note.timestamp,
                note.category,
                note.author,
                note.body,
            ]
            for note in operator_notes
        ]
        or [["None", "", "", ""]],
    )
    timeline_table = table(["Time", "Type", "Details"], timeline_rows(replay))

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Incident Report - {escape(replay.scenario.name)}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; }}
    header {{ border-bottom: 3px solid #0f172a; margin-bottom: 24px; padding-bottom: 16px; }}
    h1, h2 {{ margin: 0 0 12px; }}
    h2 {{ border-bottom: 1px solid #cbd5e1; margin-top: 28px; padding-bottom: 6px; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 12px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }}
    th {{ background: #e2e8f0; }}
    .badge {{ display: inline-block; border: 1px solid #0f172a; padding: 3px 8px; text-transform: uppercase; font-size: 12px; }}
    .print-note {{ color: #475569; font-size: 13px; }}
    @media print {{ button, .print-note {{ display: none; }} body {{ margin: 18mm; }} }}
  </style>
</head>
<body>
  <header>
    <p class="badge">Orbital Defense Grid</p>
    <h1>Incident Report</h1>
    <p><strong>Scenario:</strong> {escape(replay.scenario.name)}</p>
    <p><strong>Scenario ID:</strong> {escape(replay.scenario.id)}</p>
    <p><strong>Started:</strong> {escape(replay.scenario.started_at)}</p>
    <p><strong>Status:</strong> {escape(replay.scenario.status.upper())}</p>
    <p><strong>Overall Severity:</strong> {escape(max_severity.upper())}</p>
    <button onclick="window.print()">Print / Export PDF</button>
    <p class="print-note">Use browser print and choose “Save as PDF” to export.</p>
  </header>

  <section>
    <h2>Executive Summary</h2>
    <p>{escape(executive_summary(threats, conjunctions, response_frames))}</p>
  </section>

  <section>
    <h2>Affected Satellites</h2>
    {affected_table}
  </section>

  <section>
    <h2>Threats Detected</h2>
    {threats_table}
  </section>

  <section>
    <h2>Conjunction Alerts</h2>
    {conjunctions_table}
  </section>

  <section>
    <h2>Response Actions Taken</h2>
    {responses_table}
  </section>

  <section>
    <h2>Operator Notes</h2>
    {notes_table}
  </section>

  <section>
    <h2>Incident Timeline</h2>
    {timeline_table}
  </section>

  <section>
    <h2>Final Outcome</h2>
    <p>{escape(final_outcome(replay.scenario.status, satellites, threats, conjunctions))}</p>
  </section>

  <section>
    <h2>Lessons Learned</h2>
    <ul>
      <li>Telemetry anomalies should be isolated before operator displays trust reported position data.</li>
      <li>Independent orbit validation improves confidence during suspected spoofing.</li>
      <li>Collision screening should continue during cyber incident response.</li>
    </ul>
  </section>

  <section>
    <h2>Recommended Improvements</h2>
    <ul>
      <li>Add automated response playbooks for telemetry spoofing.</li>
      <li>Add richer replay annotations for operator decisions.</li>
      <li>Add report signatures and PDF generation in a later release.</li>
    </ul>
  </section>
</body>
</html>"""


def table(headers: list[str], rows: list[list[Any]]) -> str:
    header_html = "".join(f"<th>{escape(str(header))}</th>" for header in headers)
    rows_html = "".join(
        "<tr>" + "".join(f"<td>{escape(str(cell))}</td>" for cell in row) + "</tr>"
        for row in rows
    )
    return f"<table><thead><tr>{header_html}</tr></thead><tbody>{rows_html}</tbody></table>"


def latest_records(frames, key: str) -> list[dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    fallback_index = 0

    for frame in frames:
        for item in frame.payload.get(key, []):
            record_id = item.get("id")
            if not record_id:
                fallback_index += 1
                record_id = f"{key}-{fallback_index}"
            records[str(record_id)] = item

    return list(records.values())


def response_rows(response_frames) -> list[list[str]]:
    rows = []
    for frame in response_frames:
        response = frame.payload.get("response", {})
        rows.append(
            [
                f"t+{frame.elapsed_seconds:.1f}s",
                response.get("action", ""),
                response.get("result", ""),
                str(response.get("risk_score_delta", "")),
                response.get("explanation", ""),
            ]
        )
    return rows or [["None", "", "", "", ""]]


def timeline_rows(replay: ScenarioReplay) -> list[list[str]]:
    rows = []
    for frame in replay.timeline:
        detail = frame.kind
        if frame.payload.get("event"):
            detail = frame.payload["event"].get("message", detail)
        elif frame.payload.get("response"):
            detail = frame.payload["response"].get("explanation", detail)
        elif frame.kind == "snapshot":
            detail = "Telemetry snapshot recorded."
        rows.append([f"t+{frame.elapsed_seconds:.1f}s", frame.kind, detail])
    return rows


def executive_summary(threats, conjunctions, response_frames) -> str:
    return (
        f"The scenario recorded {len(threats)} active threat record(s), "
        f"{len(conjunctions)} conjunction alert(s), and {len(response_frames)} response action(s). "
        "This report is generated from stored replay frames."
    )


def final_outcome(status, satellites, threats, conjunctions) -> str:
    if status in {"contained", "resolved"}:
        return f"Scenario was closed as {status}; final snapshot retained for replay and audit review."
    if status == "reset":
        return "Scenario was reset to baseline by the operator."

    critical_satellites = [item for item in satellites if item.get("risk_score", 0) >= 80]
    if critical_satellites:
        return "Incident remains active with at least one high-risk satellite requiring review."
    if threats or conjunctions:
        return "Incident remains under monitoring with active simulated risk indicators."
    return "No active risk indicators remained in the final stored snapshot."


def highest_severity(severities: list[str]) -> str:
    rank = {"nominal": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
    return max(severities or ["nominal"], key=lambda item: rank.get(item, 0))
