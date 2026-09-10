from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path

from skyfield.api import EarthSatellite
from skyfield.api import load
from skyfield.api import wgs84

from app.models import Satellite
from app.simulation.orbit_engine import SATELLITE_SEEDS


DEFAULT_TLE_PATH = Path(__file__).resolve().parents[1] / "data" / "sample.tle"


@dataclass(frozen=True)
class TleRecord:
    name: str
    line1: str
    line2: str


def parse_tle_file(path: Path = DEFAULT_TLE_PATH) -> list[TleRecord]:
    return parse_tle_text(path.read_text())


def parse_tle_text(content: str) -> list[TleRecord]:
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    records: list[TleRecord] = []

    for index in range(0, len(lines), 3):
        chunk = lines[index : index + 3]
        if len(chunk) != 3:
            raise ValueError(f"Incomplete TLE record starting at line {index + 1}")

        name, line1, line2 = chunk
        if not line1.startswith("1 ") or not line2.startswith("2 "):
            raise ValueError(f"Invalid TLE record for {name}")

        records.append(TleRecord(name=name, line1=line1, line2=line2))

    return records


class TleOrbitProvider:
    def __init__(self, path: Path = DEFAULT_TLE_PATH, records: list[TleRecord] | None = None) -> None:
        self.timescale = load.timescale(builtin=True)
        self.records = records if records is not None else parse_tle_file(path)
        self.satellites = [
            EarthSatellite(record.line1, record.line2, record.name, self.timescale)
            for record in self.records
        ]
        self.seed_by_name = {seed.name: seed for seed in SATELLITE_SEEDS}

    def current_satellites(self) -> list[Satellite]:
        now = self.timescale.now()
        tracked: list[Satellite] = []

        for tle_satellite in self.satellites:
            seed = self.seed_by_name.get(tle_satellite.name)
            geocentric = tle_satellite.at(now)
            subpoint = wgs84.subpoint(geocentric)
            velocity_km_s = math.sqrt(sum(component**2 for component in geocentric.velocity.km_per_s))
            orbital_period_minutes = (2 * math.pi) / tle_satellite.model.no_kozai
            inclination = math.degrees(tle_satellite.model.inclo)
            phase = math.degrees(tle_satellite.model.mo) % 360

            tracked.append(
                Satellite(
                    id=seed.id if seed else satellite_id(tle_satellite.name),
                    name=tle_satellite.name,
                    latitude=round(subpoint.latitude.degrees, 4),
                    longitude=round(subpoint.longitude.degrees, 4),
                    altitude_km=round(subpoint.elevation.km, 2),
                    velocity_km_s=round(velocity_km_s, 3),
                    health=seed.health if seed else "nominal",
                    risk_score=seed.risk_score if seed else 10,
                    status=seed.status if seed else "tracking",
                    inclination=round(inclination, 2),
                    orbital_period_minutes=round(orbital_period_minutes, 2),
                    phase=round(phase, 2),
                )
            )

        return tracked


def satellite_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"sat-{slug or 'tle'}"
