from __future__ import annotations

import os


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


USE_REAL_TLE = env_flag("USE_REAL_TLE", default=False)
USE_REMOTE_TLE = env_flag("USE_REMOTE_TLE", default=False)
CELESTRAK_GROUP = os.getenv("CELESTRAK_GROUP", "STATIONS")
CELESTRAK_CACHE_TTL_SECONDS = int(os.getenv("CELESTRAK_CACHE_TTL_SECONDS", "7200"))
CELESTRAK_CACHE_PATH = os.getenv("CELESTRAK_CACHE_PATH", "/app/data/celestrak.tle")
