"""
Pytest config — points the app at a throwaway SQLite DB and temp report dir
BEFORE any app module is imported.
"""
import os
import sys
import tempfile
from pathlib import Path

# Make backend/ importable when pytest runs from repo root or backend/
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_tmp = tempfile.mkdtemp(prefix="prism_test_")
os.environ.setdefault("DB_URL", f"sqlite+aiosqlite:///{_tmp}/test.db")
os.environ.setdefault("PRISM_REPORT_DIR", f"{_tmp}/reports")
os.environ.setdefault("CLASSIFIER_MODE", "heuristic")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    from main import app

    with TestClient(app) as c:  # runs lifespan: init_db + warmup
        yield c
