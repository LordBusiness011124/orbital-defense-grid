from pathlib import Path

from app.simulation.celestrak_provider import CELESTRAK_GP_URL
from app.simulation.celestrak_provider import CelesTrakTleProvider
from app.simulation.celestrak_provider import fetch_celestrak_tle


SAMPLE_TLE = """ORION-1
1 25544U 98067A   20029.54791435  .00000728  00000-0  20595-4 0  9993
2 25544  51.6432  23.4361 0007417  68.0431  61.7660 15.49147121210878
"""


class FakeResponse:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self):
        return SAMPLE_TLE.encode("utf-8")


def test_fetch_celestrak_tle_requests_tle_format(monkeypatch) -> None:
    captured = {}

    def fake_urlopen(url, timeout):
        captured["url"] = url
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.simulation.celestrak_provider.urlopen", fake_urlopen)

    content = fetch_celestrak_tle("STATIONS")

    assert content == SAMPLE_TLE
    assert captured["url"].startswith(CELESTRAK_GP_URL)
    assert "GROUP=STATIONS" in captured["url"]
    assert "FORMAT=TLE" in captured["url"]
    assert captured["timeout"] == 8


def test_celestrak_provider_uses_cache_without_network(tmp_path: Path) -> None:
    cache_path = tmp_path / "celestrak.tle"
    cache_path.write_text(SAMPLE_TLE)
    provider = CelesTrakTleProvider(
        group="STATIONS",
        cache_path=str(cache_path),
        cache_ttl_seconds=7200,
    )

    satellites = provider.current_satellites()

    assert len(satellites) == 1
    assert satellites[0].name == "ORION-1"


def test_celestrak_provider_falls_back_to_sample_file(tmp_path: Path, monkeypatch) -> None:
    def broken_fetch(_group: str) -> str:
        raise TimeoutError("offline")

    monkeypatch.setattr("app.simulation.celestrak_provider.fetch_celestrak_tle", broken_fetch)
    provider = CelesTrakTleProvider(
        group="STATIONS",
        cache_path=str(tmp_path / "missing.tle"),
        cache_ttl_seconds=7200,
    )

    satellites = provider.current_satellites()

    assert len(satellites) == 5
    assert satellites[0].name == "ORION-1"
