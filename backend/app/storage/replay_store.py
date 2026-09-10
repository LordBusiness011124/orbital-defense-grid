from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any
from datetime import UTC
from datetime import datetime

from app.models import OperatorNote
from app.models import ReplayFrame
from app.models import ScenarioReplay
from app.models import ScenarioRunSummary


class ReplayStore:
    def __init__(self, database_path: str | None = None) -> None:
        self.database_path = database_path or os.getenv(
            "ODG_SQLITE_PATH",
            "/app/data/orbital_defense_grid.db",
        )
        Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def create_scenario(self, scenario_id: str, name: str, started_at: str) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO scenario_runs (id, name, started_at, status)
                VALUES (?, ?, ?, ?)
                """,
                (scenario_id, name, started_at, "running"),
            )

    def record_frame(
        self,
        scenario_id: str | None,
        elapsed_seconds: float | None,
        kind: str,
        payload: dict[str, Any],
    ) -> None:
        if not scenario_id or elapsed_seconds is None:
            return

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO replay_frames (scenario_id, elapsed_seconds, kind, payload_json)
                VALUES (?, ?, ?, ?)
                """,
                (scenario_id, elapsed_seconds, kind, json.dumps(payload)),
            )

    def update_scenario_status(self, scenario_id: str | None, status: str) -> None:
        if not scenario_id:
            return

        with self._connect() as connection:
            connection.execute(
                """
                UPDATE scenario_runs
                SET status = ?
                WHERE id = ?
                """,
                (status, scenario_id),
            )

    def add_operator_note(
        self,
        scenario_id: str,
        body: str,
        author: str = "Operator",
        category: str = "observation",
        elapsed_seconds: float | None = None,
    ) -> OperatorNote:
        note_timestamp = datetime.now(UTC).isoformat()
        cleaned_body = body.strip()
        cleaned_author = author.strip() or "Operator"
        cleaned_category = category.strip() or "observation"

        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO operator_notes (
                    scenario_id, timestamp, elapsed_seconds, author, category, body
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    scenario_id,
                    note_timestamp,
                    elapsed_seconds,
                    cleaned_author,
                    cleaned_category,
                    cleaned_body,
                ),
            )
            note_id = cursor.lastrowid

        return OperatorNote(
            id=int(note_id),
            scenario_id=scenario_id,
            timestamp=note_timestamp,
            elapsed_seconds=elapsed_seconds,
            author=cleaned_author,
            category=cleaned_category,
            body=cleaned_body,
        )

    def list_operator_notes(self, scenario_id: str) -> list[OperatorNote]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT id, scenario_id, timestamp, elapsed_seconds, author, category, body
                FROM operator_notes
                WHERE scenario_id = ?
                ORDER BY id ASC
                """,
                (scenario_id,),
            ).fetchall()

        return [
            OperatorNote(
                id=row["id"],
                scenario_id=row["scenario_id"],
                timestamp=row["timestamp"],
                elapsed_seconds=row["elapsed_seconds"],
                author=row["author"],
                category=row["category"],
                body=row["body"],
            )
            for row in rows
        ]

    def list_scenarios(self) -> list[ScenarioRunSummary]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT scenario_runs.id, scenario_runs.name, scenario_runs.started_at,
                       scenario_runs.status, COUNT(replay_frames.id) AS frame_count
                FROM scenario_runs
                LEFT JOIN replay_frames ON replay_frames.scenario_id = scenario_runs.id
                GROUP BY scenario_runs.id
                ORDER BY scenario_runs.started_at DESC
                """
            ).fetchall()

        return [
            ScenarioRunSummary(
                id=row["id"],
                name=row["name"],
                started_at=row["started_at"],
                status=row["status"],
                frame_count=row["frame_count"],
            )
            for row in rows
        ]

    def get_replay(self, scenario_id: str) -> ScenarioReplay | None:
        with self._connect() as connection:
            scenario_row = connection.execute(
                """
                SELECT scenario_runs.id, scenario_runs.name, scenario_runs.started_at,
                       scenario_runs.status, COUNT(replay_frames.id) AS frame_count
                FROM scenario_runs
                LEFT JOIN replay_frames ON replay_frames.scenario_id = scenario_runs.id
                WHERE scenario_runs.id = ?
                GROUP BY scenario_runs.id
                """,
                (scenario_id,),
            ).fetchone()

            if scenario_row is None:
                return None

            frame_rows = connection.execute(
                """
                SELECT id, scenario_id, elapsed_seconds, kind, payload_json
                FROM replay_frames
                WHERE scenario_id = ?
                ORDER BY elapsed_seconds ASC, id ASC
                """,
                (scenario_id,),
            ).fetchall()

        scenario = ScenarioRunSummary(
            id=scenario_row["id"],
            name=scenario_row["name"],
            started_at=scenario_row["started_at"],
            status=scenario_row["status"],
            frame_count=scenario_row["frame_count"],
        )
        timeline = [
            ReplayFrame(
                id=row["id"],
                scenario_id=row["scenario_id"],
                elapsed_seconds=row["elapsed_seconds"],
                kind=row["kind"],
                payload=json.loads(row["payload_json"]),
            )
            for row in frame_rows
        ]
        notes = self.list_operator_notes(scenario_id)

        return ScenarioReplay(scenario=scenario, timeline=timeline, notes=notes)

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS scenario_runs (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    status TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS replay_frames (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario_id TEXT NOT NULL,
                    elapsed_seconds REAL NOT NULL,
                    kind TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    FOREIGN KEY (scenario_id) REFERENCES scenario_runs(id)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS operator_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    elapsed_seconds REAL,
                    author TEXT NOT NULL,
                    category TEXT NOT NULL,
                    body TEXT NOT NULL,
                    FOREIGN KEY (scenario_id) REFERENCES scenario_runs(id)
                )
                """
            )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection
