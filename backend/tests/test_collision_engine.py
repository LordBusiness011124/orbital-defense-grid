from app.simulation.collision_engine import CollisionEngine
from app.simulation.debris_engine import DebrisEngine
from app.simulation.orbit_engine import OrbitEngine


def test_debris_engine_returns_objects() -> None:
    satellites = OrbitEngine().current_satellites()
    debris = DebrisEngine().current_debris(satellites)

    assert len(debris) == 3
    assert any(item.id == "debris-close-219" for item in debris)


def test_collision_engine_returns_close_approach_alert() -> None:
    satellites = OrbitEngine().current_satellites()
    debris = DebrisEngine().current_debris(satellites)

    alerts = CollisionEngine().current_alerts(satellites, debris)

    assert alerts
    assert alerts[0].satellite_id == "sat-aegis-4"
    assert alerts[0].estimated_distance_km < 25
