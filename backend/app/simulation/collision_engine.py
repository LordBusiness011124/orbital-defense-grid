from __future__ import annotations

import math

from app.models import ConjunctionAlert
from app.models import DebrisObject
from app.models import Satellite

EARTH_RADIUS_KM = 6371.0
ALERT_DISTANCE_KM = 25.0


class CollisionEngine:
    def current_alerts(
        self,
        satellites: list[Satellite],
        debris_objects: list[DebrisObject],
    ) -> list[ConjunctionAlert]:
        alerts: list[ConjunctionAlert] = []

        for satellite in satellites:
            for debris in debris_objects:
                distance = distance_km(satellite, debris)

                if distance > ALERT_DISTANCE_KM:
                    continue

                severity = "critical" if distance < 10 else "high"
                alerts.append(
                    ConjunctionAlert(
                        id=f"conjunction-{satellite.id}-{debris.id}",
                        satellite_id=satellite.id,
                        satellite_name=satellite.name,
                        debris_id=debris.id,
                        debris_name=debris.name,
                        estimated_distance_km=round(distance, 2),
                        time_to_closest_approach_seconds=max(30, int(distance * 18)),
                        severity=severity,
                        recommendation="Increase tracking priority and run evasive maneuver simulation.",
                    )
                )

        return sorted(alerts, key=lambda alert: alert.estimated_distance_km)


def distance_km(satellite: Satellite, debris: DebrisObject) -> float:
    sx, sy, sz = to_ecef(satellite.latitude, satellite.longitude, satellite.altitude_km)
    dx, dy, dz = to_ecef(debris.latitude, debris.longitude, debris.altitude_km)

    return math.sqrt((sx - dx) ** 2 + (sy - dy) ** 2 + (sz - dz) ** 2)


def to_ecef(latitude: float, longitude: float, altitude_km: float) -> tuple[float, float, float]:
    radius = EARTH_RADIUS_KM + altitude_km
    lat = math.radians(latitude)
    lon = math.radians(longitude)

    return (
        radius * math.cos(lat) * math.cos(lon),
        radius * math.cos(lat) * math.sin(lon),
        radius * math.sin(lat),
    )
