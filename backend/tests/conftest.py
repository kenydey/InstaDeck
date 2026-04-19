from __future__ import annotations

import importlib
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("INSTADECK_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("TAVILY_API_KEY", "")
    import instadeck.config as cfg
    import instadeck.main as main_mod

    importlib.reload(cfg)
    importlib.reload(main_mod)
    with TestClient(main_mod.app) as c:
        yield c
