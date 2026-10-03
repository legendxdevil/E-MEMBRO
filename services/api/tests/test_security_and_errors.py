import pytest
import os
import shutil
import tempfile
from fastapi.testclient import TestClient
from app.config import settings
from app.main import app
from app.core.rate_limiter import rate_limiter
from app.schemas.enums import ConflictDecision, MemoryCategory

@pytest.fixture(autouse=True)
def reset_rate_limits():
    rate_limiter.reset()

@pytest.fixture(scope="module")
def client():
    test_dir = tempfile.mkdtemp(prefix="edge_sec_test_")
    test_db = os.path.join(test_dir, "test_sec.db")
    test_qdrant_edge = os.path.join(test_dir, "qdrant_edge")
    settings.SQLITE_DB_PATH = test_db
    settings.EDGE_QDRANT_PATH = test_qdrant_edge
    settings.QDRANT_CLOUD_URL = ":memory:"
    settings.QDRANT_CLOUD_API_KEY = "test-api-key"

    with TestClient(app) as test_client:
        yield test_client

    shutil.rmtree(test_dir, ignore_errors=True)

def test_http_404_not_found(client):
    res = client.get("/api/v1/memories/00000000-0000-0000-0000-000000000099")
    assert res.status_code == 404
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "MEMORY_NOT_FOUND"
    assert "request_id" in data["error"]

def test_http_422_invalid_category(client):
    res = client.post("/api/v1/memories", json={
        "text": "Valid text but invalid category enum",
        "category": "super_secret_category_that_does_not_exist"
    })
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"

def test_manual_conflict_resolution(client):
    # Create two memories
    mem_a = client.post("/api/v1/memories", json={
        "text": "Loading dock door is locked.",
        "category": "important"
    }).json()
    mem_b = client.post("/api/v1/memories", json={
        "text": "Loading dock door is unlocked.",
        "category": "important"
    }).json()

    # Sync mem_a to cloud first so it exists in cloud vector store
    client.post("/api/v1/sync/batch", json={
        "device_id": "00000000-0000-0000-0000-000000000001",
        "idempotency_key": "batch-loading-dock-a",
        "items": [
            {
                "memory_id": mem_a["id"],
                "operation": "create",
                "version": 1,
                "category": "important",
                "privacy": "sync_allowed",
                "text": mem_a["text"],
                "created_at": mem_a["created_at"],
                "updated_at": mem_a["updated_at"]
            }
        ]
    })

    # Trigger conflict by syncing batch with mem_b from Device B
    client.post("/api/v1/sync/batch", json={
        "device_id": "00000000-0000-0000-0000-000000000002",
        "idempotency_key": "batch-loading-dock-b",
        "items": [
            {
                "memory_id": mem_b["id"],
                "operation": "create",
                "version": 1,
                "category": "important",
                "privacy": "sync_allowed",
                "text": mem_b["text"],
                "created_at": mem_b["created_at"],
                "updated_at": mem_b["updated_at"]
            }
        ]
    })

    conflicts = client.get("/api/v1/conflicts").json()
    assert len(conflicts) >= 1
    conflict_id = conflicts[0]["id"]

    # Manual resolve: User chooses A wins
    res = client.post(f"/api/v1/conflicts/{conflict_id}/resolve", json={
        "decision": "a_wins",
        "decision_reason": "Operator physically confirmed door is locked."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "resolved"
    assert data["decision"] == "a_wins"

    # Verify memory A is active and B is superseded
    check_a = client.get(f"/api/v1/memories/{mem_a['id']}").json()
    check_b = client.get(f"/api/v1/memories/{mem_b['id']}").json()
    assert check_a["status"] == "active"
    assert check_b["status"] == "superseded"

def test_rate_limiting_enforcement(client):
    hit_rate_limit = False
    for i in range(15):
        res = client.post("/api/v1/sync/process")
        if res.status_code == 429:
            hit_rate_limit = True
            data = res.json()
            assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
            assert "Retry-After" in res.headers
            break
    assert hit_rate_limit is True
