import pytest
import os
import shutil
import tempfile
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.repositories.sqlite_repository import SQLiteRepository
from app.repositories.edge_vector_store import QdrantEdgeVectorStore

@pytest.fixture(scope="module")
def client():
    # Setup isolated test directory
    test_dir = tempfile.mkdtemp(prefix="edge_test_")
    test_db = os.path.join(test_dir, "test.db")
    test_qdrant = os.path.join(test_dir, "qdrant")

    settings.SQLITE_DB_PATH = test_db
    settings.EDGE_QDRANT_PATH = test_qdrant

    with TestClient(app) as test_client:
        yield test_client

    # Cleanup
    shutil.rmtree(test_dir, ignore_errors=True)

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "Edge Memory Platform" in data["app"]

def test_create_memory_success(client):
    payload = {
        "text": "Server node 4 deployed in rack B.",
        "category": "important",
        "privacy": "sync_allowed",
        "tags": ["server", "rack", "infrastructure"]
    }
    res = client.post("/api/v1/memories", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["text"] == payload["text"]
    assert data["category"] == "important"
    assert data["privacy"] == "sync_allowed"
    assert data["version"] == 1
    assert data["sync_state"] == "pending"
    assert "id" in data

def test_create_private_memory_enforces_local_only(client):
    payload = {
        "text": "Secret operational keycode: 7729.",
        "category": "private",
        "privacy": "sync_allowed", # Should be overridden to local_only
        "tags": ["secret"]
    }
    res = client.post("/api/v1/memories", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["category"] == "private"
    assert data["privacy"] == "local_only"
    assert data["sync_state"] == "local_only"

def test_empty_text_validation_failure(client):
    payload = {
        "text": "   ",
        "category": "normal"
    }
    res = client.post("/api/v1/memories", json=payload)
    assert res.status_code == 422
    err = res.json()
    assert "error" in err
    assert err["error"]["code"] == "VALIDATION_ERROR"
    assert "request_id" in err["error"]

def test_get_and_list_memories(client):
    res = client.get("/api/v1/memories")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert len(data["memories"]) >= 2

def test_update_memory_and_version_history(client):
    # Create memory
    created = client.post("/api/v1/memories", json={
        "text": "Original documentation title.",
        "category": "normal",
        "privacy": "sync_allowed"
    }).json()
    mem_id = created["id"]

    # Update memory
    updated = client.patch(f"/api/v1/memories/{mem_id}", json={
        "text": "Updated documentation title with new guidelines.",
        "change_reason": "Refreshed guidelines"
    }).json()

    assert updated["version"] == 2
    assert updated["text"] == "Updated documentation title with new guidelines."

    # Check versions list
    versions_res = client.get(f"/api/v1/memories/{mem_id}/versions")
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[1]["version_number"] == 1
    assert versions[1]["text_snapshot"] == "Original documentation title."

def test_archive_and_restore_memory(client):
    created = client.post("/api/v1/memories", json={
        "text": "Temporary staging checklist.",
        "category": "normal"
    }).json()
    mem_id = created["id"]

    # Archive
    arch = client.post(f"/api/v1/memories/{mem_id}/archive").json()
    assert arch["status"] == "archived"

    # Restore
    restored = client.post(f"/api/v1/memories/{mem_id}/restore").json()
    assert restored["status"] == "active"

def test_delete_memory_tombstone(client):
    created = client.post("/api/v1/memories", json={
        "text": "Obsolete decommissioning notes.",
        "category": "normal"
    }).json()
    mem_id = created["id"]

    del_res = client.delete(f"/api/v1/memories/{mem_id}")
    assert del_res.status_code == 200

    # Getting deleted memory shows status deleted
    get_res = client.get(f"/api/v1/memories/{mem_id}").json()
    assert get_res["status"] == "deleted"

def test_local_semantic_search(client):
    # Create specific memory
    client.post("/api/v1/memories", json={
        "text": "Perimeter Gate 3 is currently locked and closed.",
        "category": "important",
        "tags": ["gate"]
    })

    # Search with natural language query
    search_res = client.post("/api/v1/search", json={
        "query": "Which gate is locked?",
        "limit": 5,
        "threshold": 0.4
    })
    assert search_res.status_code == 200
    data = search_res.json()
    assert "latency_ms" in data
    assert data["latency_ms"] >= 0
    assert data["total_results"] >= 1
    top_result = data["results"][0]
    assert "Gate 3" in top_result["text"]
    assert top_result["score"] >= 0.4

def test_search_no_match_returns_empty(client):
    search_res = client.post("/api/v1/search", json={
        "query": "Completely unrelated quantum astrophysics formula xyz999",
        "threshold": 0.85
    })
    assert search_res.status_code == 200
    data = search_res.json()
    assert data["total_results"] == 0
    assert data["results"] == []
