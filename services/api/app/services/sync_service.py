import random
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from app.config import settings
from app.schemas.enums import (
    SyncState,
    SyncJobStatus,
    SyncJobPriority,
    SyncOperation,
    PrivacyLevel,
    MemoryCategory,
    MemoryStatus,
    ActivityEventType,
)
from app.schemas.schemas import SyncBatchRequest, SyncItem
from app.repositories.sqlite_repository import SQLiteRepository
from app.repositories.cloud_vector_store import CloudVectorStoreAdapter, QdrantCloudVectorStore
from app.services.embedding_service import EmbeddingService
from app.services.conflict_service import ConflictService

class SyncService:
    # Class-level Circuit Breaker state (shared across all request instances)
    _consecutive_failures: int = 0
    _circuit_open_until: Optional[datetime] = None

    def __init__(
        self,
        db_repo: Optional[SQLiteRepository] = None,
        cloud_vector_store: Optional[CloudVectorStoreAdapter] = None,
        conflict_service: Optional[ConflictService] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        self.db = db_repo or SQLiteRepository()
        self.cloud_vector = cloud_vector_store or QdrantCloudVectorStore()
        self.embedding = embedding_service or EmbeddingService.get_instance()
        self.conflict = conflict_service or ConflictService(db_repo=self.db, cloud_vector_store=self.cloud_vector)
        self.device_id = settings.DEVICE_ID

    def is_online(self) -> bool:
        # Check runtime offline simulation setting first
        sim_val = self.db.get_setting("offline_simulation", "false") or "false"
        if sim_val.lower() == "true":
            return False
        if settings.OFFLINE_SIMULATION:
            return False
        return True

    def is_sync_enabled(self) -> bool:
        enabled_val = self.db.get_setting("sync_enabled", "true") or "true"
        return enabled_val.lower() == "true" and settings.SYNC_ENABLED

    def set_offline_simulation(self, enabled: bool) -> dict[str, Any]:
        self.db.set_setting("offline_simulation", "true" if enabled else "false")
        self.db.record_activity(
            event_type="network.status_changed",
            actor_device_id=self.device_id,
            details={"offline_simulation": enabled}
        )
        queue_result = None
        if not enabled:
            # Deliberate user action to go online: reset circuit breaker immediately
            self.reset_circuit_success()
            # Explicitly trigger immediate queue processing
            if self.is_sync_enabled():
                queue_result = self.process_sync_queue(max_batch_size=50)
        return {
            "offline_simulation": enabled,
            "queue_processed": queue_result
        }

    def set_sync_enabled(self, enabled: bool) -> dict[str, Any]:
        self.db.set_setting("sync_enabled", "true" if enabled else "false")
        self.db.record_activity(
            event_type="sync.setting_changed",
            actor_device_id=self.device_id,
            details={"sync_enabled": enabled}
        )
        queue_result = None
        if enabled:
            if self.is_online():
                queue_result = self.process_sync_queue(max_batch_size=50)
        return {
            "sync_enabled": enabled,
            "queue_processed": queue_result
        }

    @classmethod
    def is_circuit_breaker_open(cls) -> bool:
        if cls._circuit_open_until is not None:
            if datetime.now(timezone.utc) < cls._circuit_open_until:
                return True
            else:
                # Cooldown expired, half-open probe
                cls._circuit_open_until = None
                cls._consecutive_failures = 0
        return False

    @classmethod
    def trigger_circuit_failure(cls) -> None:
        cls._consecutive_failures += 1
        if cls._consecutive_failures >= settings.CIRCUIT_BREAKER_FAIL_THRESHOLD:
            cls._circuit_open_until = datetime.now(timezone.utc) + timedelta(seconds=settings.CIRCUIT_BREAKER_COOLDOWN_SECONDS)
            print(f"Warning: Circuit breaker tripped OPEN until {cls._circuit_open_until.isoformat()}")

    @classmethod
    def reset_circuit_success(cls) -> None:
        cls._consecutive_failures = 0
        cls._circuit_open_until = None

    @classmethod
    def get_circuit_breaker_status(cls) -> dict[str, Any]:
        is_open = cls.is_circuit_breaker_open()
        remaining_cooldown = 0.0
        if cls._circuit_open_until is not None:
            now = datetime.now(timezone.utc)
            if now < cls._circuit_open_until:
                remaining_cooldown = max(0.0, round((cls._circuit_open_until - now).total_seconds(), 1))
        return {
            "state": "OPEN" if is_open else "CLOSED",
            "consecutive_failures": cls._consecutive_failures,
            "remaining_cooldown_seconds": remaining_cooldown
        }

    def get_sync_status(self) -> dict[str, Any]:
        with self.db.get_connection() as conn:
            pending = conn.execute("SELECT COUNT(*) as c FROM sync_jobs WHERE status = 'pending'").fetchone()["c"]
            failed = conn.execute("SELECT COUNT(*) as c FROM sync_jobs WHERE status = 'failed'").fetchone()["c"]
            succeeded = conn.execute("SELECT COUNT(*) as c FROM sync_jobs WHERE status = 'succeeded'").fetchone()["c"]
            blocked = conn.execute("SELECT COUNT(*) as c FROM sync_jobs WHERE status = 'blocked'").fetchone()["c"]

            last_job = conn.execute("""
            SELECT updated_at FROM sync_jobs WHERE status = 'succeeded' ORDER BY updated_at DESC LIMIT 1
            """).fetchone()
            last_sync = last_job["updated_at"] if last_job else None

        cb_info = self.get_circuit_breaker_status()

        return {
            "is_online": self.is_online(),
            "sync_enabled": self.is_sync_enabled(),
            "offline_simulation": (self.db.get_setting("offline_simulation", "false") or "false").lower() == "true",
            "circuit_breaker_open": cb_info["state"] == "OPEN",
            "circuit_breaker_state": cb_info["state"],
            "circuit_breaker_cooldown_remaining": cb_info["remaining_cooldown_seconds"],
            "pending_jobs_count": pending,
            "failed_jobs_count": failed,
            "succeeded_jobs_count": succeeded,
            "blocked_private_count": blocked,
            "last_sync_time": last_sync,
            "active_device_id": self.device_id
        }

    def process_sync_queue(self, max_batch_size: int = 20) -> dict[str, Any]:
        """
        Durable queue processing workflow:
        1. Check online status and sync enabled.
        2. Check circuit breaker.
        3. Fetch eligible jobs ordered by priority and creation time.
        4. Re-check privacy immediately before upload.
        5. Build idempotent batch.
        6. Upload to Cloud Sync endpoint / cloud vector store.
        7. Update per-job status and record activity.
        """
        if not self.is_online():
            return {
                "status": "offline",
                "message": "Device is offline. Queued jobs preserved safely in local SQLite.",
                "processed_count": 0
            }

        if not self.is_sync_enabled():
            return {
                "status": "paused",
                "message": "Sync is paused. Queued jobs preserved.",
                "processed_count": 0
            }

        if self.is_circuit_breaker_open():
            return {
                "status": "circuit_open",
                "message": f"Circuit breaker is OPEN. Upstream failures cooling down until {self.circuit_open_until.isoformat() if self.circuit_open_until else 'N/A'}",
                "processed_count": 0
            }

        pending_jobs = self.db.get_pending_sync_jobs(limit=max_batch_size)
        if not pending_jobs:
            return {"status": "idle", "message": "No pending sync jobs in queue.", "processed_count": 0}

        batch_items: list[SyncItem] = []
        jobs_to_process: list[dict[str, Any]] = []

        now_iso = datetime.now(timezone.utc).isoformat()

        # Re-check privacy and prepare items
        for job in pending_jobs:
            mem = self.db.get_memory(job["memory_id"])
            if not mem:
                self.db.update_sync_job(job["id"], {
                    "status": SyncJobStatus.FAILED.value,
                    "last_error": "Associated memory no longer exists"
                })
                continue

            # CRITICAL PRIVACY GATE: Re-check immediately before upload!
            if mem["category"] == MemoryCategory.PRIVATE.value or mem["privacy"] == PrivacyLevel.LOCAL_ONLY.value:
                self.db.update_sync_job(job["id"], {
                    "status": SyncJobStatus.BLOCKED.value,
                    "last_error": "Blocked by privacy policy: Memory is private/local-only"
                })
                self.db.update_memory(mem["id"], {"sync_state": SyncState.LOCAL_ONLY.value})
                self.db.record_activity(
                    event_type=ActivityEventType.SYNC_BLOCKED_PRIVATE.value,
                    actor_device_id=self.device_id,
                    memory_id=mem["id"],
                    sync_job_id=job["id"],
                    details={"reason": "Privacy gate blocked upload in sync queue"}
                )
                continue

            # Mark job processing
            self.db.update_sync_job(job["id"], {"status": SyncJobStatus.PROCESSING.value})
            jobs_to_process.append(job)

            batch_items.append(SyncItem(
                memory_id=mem["id"],
                operation=SyncOperation(job["operation"]),
                version=mem["version"],
                category=MemoryCategory(mem["category"]),
                privacy=PrivacyLevel(mem["privacy"]),
                text=mem["text"],
                tags=mem["tags"],
                source_trust=mem.get("source_trust", 1),
                created_at=mem["created_at"],
                updated_at=mem["updated_at"]
            ))

        if not batch_items:
            return {"status": "completed", "message": "All evaluated jobs were blocked or invalid.", "processed_count": 0}

        # Send batch
        batch_id = f"batch-{int(time.time())}"
        idempotency_key = f"idemp-{batch_id}-{len(batch_items)}"
        batch_req = SyncBatchRequest(
            device_id=self.device_id,
            idempotency_key=idempotency_key,
            items=batch_items
        )

        try:
            # Process batch through Cloud Sync logic
            result = self.process_incoming_sync_batch(batch_req)
            self.reset_circuit_success()

            accepted_ids = set(result["accepted"])
            rejected_dict = {r["memory_id"]: r["reason"] for r in result["rejected"]}

            # Update job states
            for job in jobs_to_process:
                mem_id = job["memory_id"]
                if mem_id in accepted_ids:
                    self.db.update_sync_job(job["id"], {
                        "status": SyncJobStatus.SUCCEEDED.value,
                        "last_error": None
                    })
                    self.db.update_memory(mem_id, {"sync_state": SyncState.SYNCED.value})
                    self.db.record_activity(
                        event_type=ActivityEventType.SYNC_SUCCEEDED.value,
                        actor_device_id=self.device_id,
                        memory_id=mem_id,
                        sync_job_id=job["id"],
                        details={"operation": job["operation"]}
                    )
                else:
                    err_msg = rejected_dict.get(mem_id, "Unknown sync rejection")
                    attempt = job["attempt_count"] + 1
                    if attempt >= settings.MAX_SYNC_ATTEMPTS:
                        new_status = SyncJobStatus.FAILED.value
                    else:
                        new_status = SyncJobStatus.PENDING.value

                    # Exponential backoff with jitter
                    backoff_delay = min(60, (2 ** attempt) + random.uniform(0.5, 2.0))
                    next_attempt = (datetime.now(timezone.utc) + timedelta(seconds=backoff_delay)).isoformat()

                    self.db.update_sync_job(job["id"], {
                        "status": new_status,
                        "attempt_count": attempt,
                        "next_attempt_at": next_attempt,
                        "last_error": err_msg
                    })
                    self.db.update_memory(mem_id, {"sync_state": SyncState.FAILED.value})
                    self.db.record_activity(
                        event_type=ActivityEventType.SYNC_FAILED.value,
                        actor_device_id=self.device_id,
                        memory_id=mem_id,
                        sync_job_id=job["id"],
                        details={"attempt": attempt, "error": err_msg, "next_attempt": next_attempt}
                    )

            return {
                "status": "completed",
                "processed_count": len(jobs_to_process),
                "accepted_count": len(result["accepted"]),
                "rejected_count": len(result["rejected"]),
                "conflicts_detected": result.get("conflicts_detected", 0)
            }

        except Exception as e:
            self.trigger_circuit_failure()
            # Restore processing jobs to pending with backoff
            for job in jobs_to_process:
                attempt = job["attempt_count"] + 1
                backoff_delay = min(60, (2 ** attempt) + random.uniform(0.5, 2.0))
                next_attempt = (datetime.now(timezone.utc) + timedelta(seconds=backoff_delay)).isoformat()
                self.db.update_sync_job(job["id"], {
                    "status": SyncJobStatus.PENDING.value if attempt < settings.MAX_SYNC_ATTEMPTS else SyncJobStatus.FAILED.value,
                    "attempt_count": attempt,
                    "next_attempt_at": next_attempt,
                    "last_error": str(e)
                })
            return {"status": "error", "error": str(e), "processed_count": len(jobs_to_process)}

    def process_incoming_sync_batch(self, batch_req: SyncBatchRequest) -> dict[str, Any]:
        """
        Cloud endpoint logic for receiving a sync batch:
        - Validates idempotency key
        - Validates items independently (rejects any private memory payload)
        - Upserts to cloud vector store
        - Triggers conflict detection & transparent resolution
        - Returns per-item results
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        # Idempotency check: if already accepted, return saved ack
        if self.db.is_sync_idempotent(batch_req.idempotency_key):
            return {
                "accepted": [item.memory_id for item in batch_req.items],
                "rejected": [],
                "server_time": now_iso,
                "conflicts_detected": 0,
                "idempotent_replay": True
            }

        accepted: list[str] = []
        rejected: list[dict[str, Any]] = []
        conflicts_count = 0

        for item in batch_req.items:
            # 1. Independent Cloud Privacy Check
            if item.category == MemoryCategory.PRIVATE or item.privacy == PrivacyLevel.LOCAL_ONLY:
                rejected.append({
                    "memory_id": item.memory_id,
                    "reason": "Cloud API rejected item: private/local_only records are strictly forbidden in cloud sync"
                })
                continue

            # 2. Process Delete Tombstones
            if item.operation == SyncOperation.DELETE:
                self.cloud_vector.delete(item.memory_id)
                accepted.append(item.memory_id)
                continue

            # 3. Embed and upsert in Cloud Vector Store
            try:
                cloud_vector = self.embedding.embed_text(item.text)
                self.cloud_vector.upsert(
                    point_id=item.memory_id,
                    vector=cloud_vector,
                    payload={
                        "memory_id": item.memory_id,
                        "device_id": batch_req.device_id,
                        "text": item.text,
                        "category": item.category.value,
                        "privacy": item.privacy.value,
                        "tags": item.tags,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at,
                        "version": item.version,
                        "status": MemoryStatus.ACTIVE.value
                    }
                )

                # Ensure cloud memory representation exists in DB if arriving from another device
                existing = self.db.get_memory(item.memory_id)
                mem_dict = {
                    "id": item.memory_id,
                    "device_id": batch_req.device_id,
                    "text": item.text,
                    "embedding_ref": item.memory_id,
                    "category": item.category.value,
                    "privacy": item.privacy.value,
                    "tags": item.tags,
                    "source": "cloud",
                    "source_trust": item.source_trust,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at,
                    "version": item.version,
                    "status": MemoryStatus.ACTIVE.value,
                    "sync_state": SyncState.SYNCED.value,
                    "supersedes": None,
                    "conflict_group_id": None
                }
                if not existing:
                    self.db.create_memory(mem_dict)
                    self.db.create_version_snapshot(
                        memory_id=item.memory_id,
                        version_number=item.version,
                        text_snapshot=item.text,
                        category_snapshot=item.category.value,
                        privacy_snapshot=item.privacy.value,
                        source_device_id=batch_req.device_id,
                        source_trust=item.source_trust,
                        change_reason="Synced from cloud",
                        is_current=True
                    )

                # 4. Trigger Semantic Conflict Candidate Detection
                detected = self.conflict.process_incoming_cloud_memory(mem_dict)
                conflicts_count += len(detected)

                accepted.append(item.memory_id)

            except Exception as e:
                rejected.append({
                    "memory_id": item.memory_id,
                    "reason": f"Failed to index in cloud memory: {str(e)}"
                })

        # Record idempotency acknowledgement
        batch_id = f"cloud-batch-{int(time.time())}"
        self.db.record_sync_ack(
            batch_id=batch_id,
            idempotency_key=batch_req.idempotency_key,
            device_id=batch_req.device_id,
            memory_ids=accepted
        )

        return {
            "accepted": accepted,
            "rejected": rejected,
            "server_time": now_iso,
            "conflicts_detected": conflicts_count
        }

    def retry_job(self, job_id: str) -> bool:
        job = None
        for j in self.db.list_sync_jobs():
            if j["id"] == job_id:
                job = j
                break
        if not job:
            return False

        self.db.update_sync_job(job_id, {
            "status": SyncJobStatus.PENDING.value,
            "next_attempt_at": datetime.now(timezone.utc).isoformat(),
            "last_error": None
        })
        return True
