from app.storage.replay_store import ReplayStore


def test_replay_store_records_scenario_and_frames(tmp_path) -> None:
    store = ReplayStore(str(tmp_path / "replay.db"))

    store.create_scenario("scenario-test", "Telemetry Spoofing on ORION-3", "2026-05-28T00:00:00Z")
    store.record_frame("scenario-test", 0, "event", {"event": {"message": "started"}})
    store.record_frame("scenario-test", 1.5, "snapshot", {"satellites": []})

    scenarios = store.list_scenarios()
    replay = store.get_replay("scenario-test")

    assert len(scenarios) == 1
    assert scenarios[0].frame_count == 2
    assert replay is not None
    assert len(replay.timeline) == 2
    assert replay.timeline[1].kind == "snapshot"


def test_replay_store_records_operator_notes(tmp_path) -> None:
    store = ReplayStore(str(tmp_path / "replay.db"))

    store.create_scenario("scenario-notes", "Telemetry Spoofing on ORION-3", "2026-05-28T00:00:00Z")
    note = store.add_operator_note(
        scenario_id="scenario-notes",
        body="Telemetry quarantine approved by flight lead.",
        author="Flight Lead",
        category="decision",
        elapsed_seconds=24.5,
    )

    notes = store.list_operator_notes("scenario-notes")
    replay = store.get_replay("scenario-notes")

    assert note.id == 1
    assert len(notes) == 1
    assert notes[0].body == "Telemetry quarantine approved by flight lead."
    assert notes[0].author == "Flight Lead"
    assert notes[0].category == "decision"
    assert notes[0].elapsed_seconds == 24.5
    assert replay is not None
    assert len(replay.notes) == 1
