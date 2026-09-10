from __future__ import annotations

import math
import time

from app.models import DebrisObject
from app.models import Satellite
from app.simulation.orbit_engine import normalize_longitude


class DebrisEngine:
    def __init__(self) -> None:
        self.started_at = time.monotonic()

    def current_debris(self, satellites: list[Satellite]) -> list[DebrisObject]:
        elapsed_seconds = time.monotonic() - self.started_at
        aegis = next((satellite for satellite in satellites if satellite.id == "sat-aegis-4"), None)

        debris = [
            self._background_debris(
                id="debris-771",
                name="DEBRIS-771",
                elapsed_seconds=elapsed_seconds,
                altitude_km=715.0,
                velocity_km_s=7.24,
                inclination=68.0,
                period_minutes=99.0,
                phase=220.0,
                longitude_offset=-130.0,
            ),
            self._background_debris(
                id="debris-144",
                name="DEBRIS-144",
                elapsed_seconds=elapsed_seconds,
                altitude_km=640.0,
                velocity_km_s=7.41,
                inclination=44.0,
                period_minutes=97.2,
                phase=41.0,
                longitude_offset=31.0,
            ),
        ]

        if aegis:
            debris.insert(
                0,
                DebrisObject(
                    id="debris-close-219",
                    name="DEBRIS-219",
                    latitude=round(max(-90, min(90, aegis.latitude + 0.06)), 4),
                    longitude=round(normalize_longitude(aegis.longitude + 0.08), 4),
                    altitude_km=round(aegis.altitude_km + 4.0, 1),
                    velocity_km_s=7.29,
                ),
            )

        return debris

    def _background_debris(
        self,
        id: str,
        name: str,
        elapsed_seconds: float,
        altitude_km: float,
        velocity_km_s: float,
        inclination: float,
        period_minutes: float,
        phase: float,
        longitude_offset: float,
    ) -> DebrisObject:
        orbit_fraction = elapsed_seconds / (period_minutes * 60)
        angle_degrees = (phase + orbit_fraction * 360) % 360
        latitude = inclination * math.sin(math.radians(angle_degrees))
        longitude = normalize_longitude(longitude_offset + orbit_fraction * 360)

        return DebrisObject(
            id=id,
            name=name,
            latitude=round(latitude, 4),
            longitude=round(longitude, 4),
            altitude_km=altitude_km,
            velocity_km_s=velocity_km_s,
        )
