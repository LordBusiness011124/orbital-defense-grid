from app.simulation.tle_loader import TleOrbitProvider
from app.simulation.tle_loader import parse_tle_file
from app.simulation.tle_loader import satellite_id


def test_parse_tle_file_loads_local_samples() -> None:
    records = parse_tle_file()

    assert len(records) == 5
    assert records[0].name == "ORION-1"
    assert records[0].line1.startswith("1 ")
    assert records[0].line2.startswith("2 ")


def test_tle_provider_returns_satellite_telemetry() -> None:
    satellites = TleOrbitProvider().current_satellites()

    assert len(satellites) == 5
    assert satellites[0].id == "sat-orion-1"
    assert satellites[0].name == "ORION-1"
    assert -90 <= satellites[0].latitude <= 90
    assert -180 <= satellites[0].longitude <= 180
    assert satellites[0].altitude_km > 0
    assert satellites[0].velocity_km_s > 0


def test_satellite_id_normalizes_unknown_tle_names() -> None:
    assert satellite_id("TEST SAT / 01") == "sat-test-sat-01"
