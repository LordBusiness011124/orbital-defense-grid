from __future__ import annotations

import math
import time
from dataclasses import dataclass

from app.models import Satellite


@dataclass(frozen=True)
class SatelliteSeed:
    id: str
    name: str
    altitude_km: float
    velocity_km_s: float
    health: str
    risk_score: int
    status: str
    inclination: float
    orbital_period_minutes: float
    phase: float
    longitude_offset: float


SATELLITE_SEEDS = [
    SatelliteSeed(
        id="sat-orion-1",
        name="ORION-1",
        altitude_km=550.0,
        velocity_km_s=7.61,
        health="nominal",
        risk_score=12,
        status="tracking",
        inclination=51.6,
        orbital_period_minutes=95.2,
        phase=16.0,
        longitude_offset=-48.2,
    ),
    SatelliteSeed(
        id="sat-orion-2",
        name="ORION-2",
        altitude_km=612.0,
        velocity_km_s=7.48,
        health="nominal",
        risk_score=18,
        status="tracking",
        inclination=63.4,
        orbital_period_minutes=96.5,
        phase=138.0,
        longitude_offset=80.8,
    ),
    SatelliteSeed(
        id="sat-orion-3",
        name="ORION-3",
        altitude_km=530.0,
        velocity_km_s=7.66,
        health="watch",
        risk_score=34,
        status="telemetry review",
        inclination=42.0,
        orbital_period_minutes=94.8,
        phase=74.0,
        longitude_offset=12.9,
    ),
    SatelliteSeed(
        id="sat-aegis-4",
        name="AEGIS-4",
        altitude_km=710.0,
        velocity_km_s=7.31,
        health="nominal",
        risk_score=9,
        status="tracking",
        inclination=72.2,
        orbital_period_minutes=98.6,
        phase=218.0,
        longitude_offset=-132.5,
    ),
    SatelliteSeed(
        id="sat-helio-5",
        name="HELIO-5",
        altitude_km=820.0,
        velocity_km_s=7.08,
        health="degraded",
        risk_score=46,
        status="power constraint",
        inclination=57.1,
        orbital_period_minutes=100.7,
        phase=304.0,
        longitude_offset=141.2,
    ),
]


class OrbitEngine:
    def __init__(self) -> None:
        self.started_at = time.monotonic()

    def current_satellites(self) -> list[Satellite]:
        elapsed_seconds = time.monotonic() - self.started_at
        return [self._position(seed, elapsed_seconds) for seed in SATELLITE_SEEDS]

    def _position(self, seed: SatelliteSeed, elapsed_seconds: float) -> Satellite:
        orbit_fraction = elapsed_seconds / (seed.orbital_period_minutes * 60)
        angle_degrees = (seed.phase + orbit_fraction * 360) % 360
        angle_radians = math.radians(angle_degrees)

        latitude = seed.inclination * math.sin(angle_radians)
        longitude = normalize_longitude(seed.longitude_offset + orbit_fraction * 360)

        return Satellite(
            id=seed.id,
            name=seed.name,
            latitude=round(latitude, 4),
            longitude=round(longitude, 4),
            altitude_km=seed.altitude_km,
            velocity_km_s=seed.velocity_km_s,
            health=seed.health,
            risk_score=seed.risk_score,
            status=seed.status,
            inclination=seed.inclination,
            orbital_period_minutes=seed.orbital_period_minutes,
            phase=round(angle_degrees, 4),
        )


def normalize_longitude(longitude: float) -> float:
    return ((longitude + 180) % 360) - 180
