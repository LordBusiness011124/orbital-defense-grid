from app.simulation.orbit_engine import OrbitEngine
from app.simulation.orbit_engine import normalize_longitude


def test_orbit_engine_returns_five_satellites() -> None:
    engine = OrbitEngine()

    satellites = engine.current_satellites()

    assert len(satellites) == 5
    assert all(-90 <= satellite.latitude <= 90 for satellite in satellites)
    assert all(-180 <= satellite.longitude <= 180 for satellite in satellites)


def test_normalize_longitude_wraps_values() -> None:
    assert normalize_longitude(181) == -179
    assert normalize_longitude(-181) == 179
