from __future__ import annotations

import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from app.models import Satellite
from app.simulation.tle_loader import DEFAULT_TLE_PATH
from app.simulation.tle_loader import TleOrbitProvider
from app.simulation.tle_loader import parse_tle_file
from app.simulation.tle_loader import parse_tle_text


CELESTRAK_GP_URL = "https://celestrak.org/NORAD/elements/gp.php"


class CelesTrakTleProvider:
    def __init__(
        self,
        group: str,
        cache_path: str,
        cache_ttl_seconds: int,
        fallback_path: Path = DEFAULT_TLE_PATH,
    ) -> None:
        self.group = group
        self.cache_path = Path(cache_path)
        self.cache_ttl_seconds = cache_ttl_seconds
        self.fallback_path = fallback_path
        self._provider: TleOrbitProvider | None = None
        self._last_loaded_at = 0.0

    def current_satellites(self) -> list[Satellite]:
        now = time.time()
        if self._provider is None or now - self._last_loaded_at > self.cache_ttl_seconds:
            self._provider = TleOrbitProvider(records=self._load_records())
            self._last_loaded_at = now

        return self._provider.current_satellites()

    def _load_records(self):
        try:
            content = self._cached_or_remote_content()
            return parse_tle_text(content)[:5]
        except Exception:
            return parse_tle_file(self.fallback_path)

    def _cached_or_remote_content(self) -> str:
        if self._cache_is_fresh():
            return self.cache_path.read_text()

        content = fetch_celestrak_tle(self.group)
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(content)
        return content

    def _cache_is_fresh(self) -> bool:
        if not self.cache_path.exists():
            return False

        age_seconds = time.time() - self.cache_path.stat().st_mtime
        return age_seconds < self.cache_ttl_seconds


def fetch_celestrak_tle(group: str) -> str:
    query = urlencode({"GROUP": group, "FORMAT": "TLE"})
    url = f"{CELESTRAK_GP_URL}?{query}"
    with urlopen(url, timeout=8) as response:
        content = response.read().decode("utf-8")

    if "No GP data found" in content or not content.strip():
        raise ValueError(f"No CelesTrak GP data returned for group {group}")

    return content
