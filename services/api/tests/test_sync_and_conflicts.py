import pytest
import os
import shutil
import tempfile
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta

from app.config import settings
from app.main import app
from app.services.sync_service import SyncService
from app.services.memory_service import MemoryService
from app.schemas.enums import MemoryCategory, PrivacyLevel, ConflictDecision
from app.core.rate_limiter import rate_limiter

@pytest.fixture(autouse=True)
def reset_rate_limits():
    rate_limiter.reset()

@pytest.fixture(scope="module")
def client():
    test_dir = tempfile.mkdtemp(prefix="edge_sync_test_")
    test_db = os.path.join(test_dir, "test_sync.db")
    test_qdrant_edge = os.path.join(test_dir, "qdrant_edge")
    test_qdrant_cloud = os.path.join(test_dir, "qdrant_cloud")

    settings.SQLITE_DB_PATH = test_db
    settings.EDGE_QDRANT_PATH = test_qdrant_edge
    settings.CLOUD_QDRANT_PATH = test_qdrant_cloud
    settings.USE_LOCAL_CLOUD_QDRANT = True

    with TestClient(app) as test_client:
        yield test_client

    shutil.rmtree(test_dir, ignore_errors=True)

def test_selective_sync_enqueuing_and_private_block(client):
    # 1. Important memory -> enqueued high
    res_imp = client.post("/api/v1/memories", json={
        "text": "Emergency evacuation route A cleared.",
        "category": "important",
        "privacy": "sync_allowed"
    }).json()
    assert res_imp["sync_state"] == "pending"

    # 2. Normal memory -> enqueued normal
    res_norm = client.post("/api/v1/memories", json={
        "text": "Cafeteria lunch hours adjusted.",
        "category": "normal",
        "privacy": "sync_allowed"
    }).json()
    assert res_norm["sync_state"] == "pending"

    # 3. Private memory -> strictly blocked
    res_priv = client.post("/api/v1/memories", json={
        "text": "Confidential patient consultation notes.",
        "category": "private",
        "privacy": "local_only"
    }).json()
    assert res_priv["sync_state"] == "local_only"

    # Process sync queue
    sync_res = client.post("/api/v1/sync/process")
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["accepted_count"] == 2 # Important + Normal only!
    assert sync_data["processed_count"] == 2

    # Verify memory sync states
    mem_imp = client.get(f"/api/v1/memories/{res_imp['id']}").json()
    assert mem_imp["sync_state"] == "synced"

    mem_priv = client.get(f"/api/v1/memories/{res_priv['id']}").json()
    assert mem_priv["sync_state"] == "local_only"

def test_privacy_transition_blocks_pending_sync(client):
    # Create sync-allowed memory
    mem = client.post("/api/v1/memories", json={
        "text": "Draft notes on project financial forecast.",
        "category": "normal",
        "privacy": "sync_allowed"
    }).json()
    mem_id = mem["id"]
    assert mem["sync_state"] == "pending"

    # Switch to private BEFORE sync processes
    updated = client.patch(f"/api/v1/memories/{mem_id}", json={
        "category": "private"
    }).json()
    assert updated["category"] == "private"
    assert updated["privacy"] == "local_only"
    assert updated["sync_state"] == "local_only"

    # Check sync jobs table -> must be marked blocked
    jobs = client.get("/api/v1/sync/jobs").json()
    blocked_jobs = [j for j in jobs if j["memory_id"] == mem_id and j["status"] == "blocked"]
    assert len(blocked_jobs) >= 1

def test_idempotent_sync_batch_replay(client):
    batch_payload = {
        "device_id": "00000000-0000-0000-0000-000000000001",
        "idempotency_key": "idemp-test-batch-001",
        "items": [
            {
                "memory_id": "11111111-1111-1111-1111-111111111111",
                "operation": "create",
                "version": 1,
                "category": "important",
                "privacy": "sync_allowed",
                "text": "Primary server power supply operating normally.",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }

    # First send
    res1 = client.post("/api/v1/sync/batch", json=batch_payload)
    assert res1.status_code == 200
    assert len(res1.json()["accepted"]) == 1

    # Replay same batch with identical idempotency key
    res2 = client.post("/api/v1/sync/batch", json=batch_payload)
    assert res2.status_code == 200
    assert res2.json().get("idempotent_replay") is True
    assert len(res2.json()["accepted"]) == 1

def test_semantic_conflict_detection_and_resolution(client):
    # Device A sets Gate 3 closed
    dev_a_id = "00000000-0000-0000-0000-000000000001"
    dev_b_id = "00000000-0000-0000-0000-000000000002"

    t1 = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    t2 = datetime.now(timezone.utc).isoformat()

    # Upload from Device A
    mem_a_id = "22222222-2222-2222-2222-222222222221"
    client.post("/api/v1/sync/batch", json={
        "device_id": dev_a_id,
        "idempotency_key": "batch-gate3-closed",
        "items": [
            {
                "memory_id": mem_a_id,
                "operation": "create",
                "version": 1,
                "category": "important",
                "privacy": "sync_allowed",
                "text": "Main Gate 3 is closed and secure.",
                "created_at": t1,
                "updated_at": t1
            }
        ]
    })

    # Upload conflicting memory from Device B with newer timestamp
    mem_b_id = "22222222-2222-2222-2222-222222222222"
    sync_res_b = client.post("/api/v1/sync/batch", json={
        "device_id": dev_b_id,
        "idempotency_key": "batch-gate3-open",
        "items": [
            {
                "memory_id": mem_b_id,
                "operation": "create",
                "version": 1,
                "category": "important",
                "privacy": "sync_allowed",
                "text": "Main Gate 3 is open for deliveries.",
                "created_at": t2,
                "updated_at": t2
            }
        ]
    })
    assert sync_res_b.status_code == 200
    assert sync_res_b.json()["conflicts_detected"] >= 1

    # Verify conflict record was created
    conflicts_res = client.get("/api/v1/conflicts")
    assert conflicts_res.status_code == 200
    conflicts = conflicts_res.json()
    assert len(conflicts) >= 1

    conflict = conflicts[0]
    assert conflict["conflict_type"] == "contradiction_candidate"
    assert conflict["decision"] == "b_wins" # Because t2 > t1
    assert "opposing status" in conflict["decision_reason"].lower() or "newer timestamp" in conflict["decision_reason"].lower()

    # Verify memory A is superseded and not deleted!
    mem_a = client.get(f"/api/v1/memories/{mem_a_id}").json()
    assert mem_a["status"] == "superseded"
    assert mem_a["supersedes"] == mem_b_id

    # Verify memory B is active
    mem_b = client.get(f"/api/v1/memories/{mem_b_id}").json()
    assert mem_b["status"] == "active"

def test_offline_simulation_toggle(client):
    # Turn offline on
    res_off = client.post("/api/v1/sync/offline-simulation", json={"offline": True})
    assert res_off.status_code == 200

    status_res = client.get("/api/v1/sync/status").json()
    assert status_res["is_online"] is False
    assert status_res["offline_simulation"] is True

    # Try processing sync while simulated offline -> should not drain queue
    proc = client.post("/api/v1/sync/process").json()
    assert proc["status"] == "offline"

    # Turn offline off
    client.post("/api/v1/sync/offline-simulation", json={"offline": False})
    status_res2 = client.get("/api/v1/sync/status").json()
    assert status_res2["is_online"] is True

def test_activity_log_privacy_redaction(client):
    # Fetch activity log
    res = client.get("/api/v1/activity")
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0

    # Ensure no event leaks private details
    for ev in events:
        if ev["event_type"] == "sync.blocked_private":
            details = ev["details"]
            assert "text" not in details or details["text"] == "[REDACTED_PRIVATE_CONTENT]"
