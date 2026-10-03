from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Request
from app.schemas.schemas import MemoryCreate
from app.schemas.enums import MemoryCategory, PrivacyLevel, MemorySource
from app.services.memory_service import MemoryService
from app.services.sync_service import SyncService
from app.config import settings

router = APIRouter(prefix="/api/v1/seed", tags=["seed"])

@router.post("/demo")
def seed_demo_scenario(
    request: Request,
    reset: bool = True
):
    mem_service = MemoryService()
    sync_service = SyncService()

    if reset:
        # Reset local and cloud vector stores
        try:
            mem_service.vector_store.clear()
        except Exception as e:
            print(f"Warning: could not clear local vector store: {e}")
        try:
            sync_service.cloud_vector.clear()
        except Exception as e:
            print(f"Warning: could not clear cloud vector store: {e}")

        # Reset SQLite tables to clean slate
        with mem_service.db.get_connection() as conn:
            conn.execute("DELETE FROM conflict_records")
            conn.execute("DELETE FROM sync_jobs")
            conn.execute("DELETE FROM memory_versions")
            conn.execute("DELETE FROM memories")
            conn.execute("DELETE FROM activity_events")
            conn.execute("DELETE FROM sync_acknowledgements")
            conn.commit()

        sync_service.set_offline_simulation(False)
        sync_service.set_sync_enabled(True)
        sync_service.reset_circuit_success()

    device_a_id = "00000000-0000-0000-0000-000000000001"
    device_b_id = "00000000-0000-0000-0000-000000000002"

    # Register devices
    mem_service.db.register_device(device_a_id, "Edge Node Alpha (Device A)", "edge_device", "1.0.0")
    mem_service.db.register_device(device_b_id, "Edge Node Beta (Device B)", "edge_device", "1.0.0")

    # Step 1: Create Memories on Device A
    # Important Memory: Gate 3 is closed
    mem_a = mem_service.create_memory(
        MemoryCreate(
            text="Gate 3 is closed.",
            category=MemoryCategory.IMPORTANT,
            privacy=PrivacyLevel.SYNC_ALLOWED,
            tags=["gate", "security", "perimeter"],
            source=MemorySource.MANUAL,
            source_trust=2
        ),
        actor_device_id=device_a_id
    )

    # Normal Memory: Annual maintenance
    mem_b = mem_service.create_memory(
        MemoryCreate(
            text="Annual facilities maintenance scheduled for next Tuesday at 09:00 UTC.",
            category=MemoryCategory.NORMAL,
            privacy=PrivacyLevel.SYNC_ALLOWED,
            tags=["facilities", "maintenance", "schedule"],
            source=MemorySource.MANUAL,
            source_trust=1
        ),
        actor_device_id=device_a_id
    )

    # Private Memory: Vault lock combination
    mem_c = mem_service.create_memory(
        MemoryCreate(
            text="Personal perimeter vault lock security keycode: 9481-ALPHA.",
            category=MemoryCategory.PRIVATE,
            privacy=PrivacyLevel.LOCAL_ONLY,
            tags=["vault", "security", "credentials"],
            source=MemorySource.MANUAL,
            source_trust=1
        ),
        actor_device_id=device_a_id
    )

    # Step 2: Synchronize Device A queue to cloud
    # (Important & Normal will sync, Private will be blocked)
    sync_result_a = sync_service.process_sync_queue(max_batch_size=50)

    # Step 3: Create conflicting memory on Device B
    # Device B: "Gate 3 is open." (created slightly later)
    mem_d = mem_service.create_memory(
        MemoryCreate(
            text="Gate 3 is open.",
            category=MemoryCategory.IMPORTANT,
            privacy=PrivacyLevel.SYNC_ALLOWED,
            tags=["gate", "security", "perimeter"],
            source=MemorySource.MANUAL,
            source_trust=2
        ),
        actor_device_id=device_b_id
    )

    # Synchronize Device B to cloud to trigger conflict detection & resolution
    sync_result_b = sync_service.process_sync_queue(max_batch_size=50)

    return {
        "status": "success",
        "message": "Demo scenario seeded successfully.",
        "device_a_memories": {
            "important": mem_a["id"],
            "normal": mem_b["id"],
            "private": mem_c["id"]
        },
        "device_b_memory": {
            "conflicting_important": mem_d["id"]
        },
        "sync_device_a": sync_result_a,
        "sync_device_b": sync_result_b
    }
