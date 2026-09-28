import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from app.config import settings
from app.schemas.enums import (
    MemoryCategory,
    PrivacyLevel,
    MemoryStatus,
    SyncState,
    MemorySource,
    SyncOperation,
    SyncJobPriority,
    ActivityEventType,
)
from app.schemas.schemas import MemoryCreate, MemoryUpdate
from app.core.errors import NotFoundError, ValidationError, ConflictError
from app.repositories.sqlite_repository import SQLiteRepository
from app.repositories.edge_vector_store import EdgeVectorStoreAdapter, QdrantEdgeVectorStore
from app.services.embedding_service import EmbeddingService

class MemoryService:
    def __init__(
        self,
        db_repo: Optional[SQLiteRepository] = None,
        vector_store: Optional[EdgeVectorStoreAdapter] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        self.db = db_repo or SQLiteRepository()
        self.vector_store = vector_store or QdrantEdgeVectorStore()
        self.embedding = embedding_service or EmbeddingService.get_instance()
        self.device_id = settings.DEVICE_ID

    def create_memory(self, req: MemoryCreate, actor_device_id: Optional[str] = None) -> dict[str, Any]:
        device = actor_device_id or self.device_id
        memory_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        # Enforce Privacy Rules: Private category MUST be local_only
        category = req.category
        privacy = req.privacy
        if category == MemoryCategory.PRIVATE:
            privacy = PrivacyLevel.LOCAL_ONLY

        # Determine Sync Policy & initial state
        if privacy == PrivacyLevel.LOCAL_ONLY or category == MemoryCategory.PRIVATE:
            sync_state = SyncState.LOCAL_ONLY
            priority = None
        elif category == MemoryCategory.IMPORTANT:
            sync_state = SyncState.PENDING
            priority = SyncJobPriority.HIGH
        else:
            sync_state = SyncState.PENDING
            priority = SyncJobPriority.NORMAL

        # Generate Embedding Locally
        embedding_ref = None
        vector = None
        embedding_failed = False
        try:
            vector = self.embedding.embed_text(req.text)
            embedding_ref = memory_id
        except Exception as e:
            # Preserve recoverable local record even if embedding fails
            embedding_failed = True
            print(f"Warning: Local embedding failed for memory {memory_id}: {e}")

        # Index in Local Vector Store
        if vector is not None:
            try:
                self.vector_store.upsert(
                    point_id=memory_id,
                    vector=vector,
                    payload={
                        "memory_id": memory_id,
                        "device_id": device,
                        "text": req.text,
                        "category": category.value,
                        "privacy": privacy.value,
                        "status": MemoryStatus.ACTIVE.value,
                        "tags": req.tags,
                        "created_at": now_iso
                    }
                )
            except Exception as e:
                print(f"Warning: Failed to index in local vector store: {e}")

        # Save Metadata to SQLite
        memory_data = {
            "id": memory_id,
            "device_id": device,
            "text": req.text,
            "embedding_ref": embedding_ref,
            "category": category.value,
            "privacy": privacy.value,
            "tags": req.tags,
            "source": req.source.value,
            "source_trust": req.source_trust,
            "created_at": now_iso,
            "updated_at": now_iso,
            "version": 1,
            "status": MemoryStatus.ACTIVE.value,
            "sync_state": sync_state.value,
            "supersedes": None,
            "conflict_group_id": None
        }
        saved_memory = self.db.create_memory(memory_data)

        # Create Initial Version Snapshot (v1)
        self.db.create_version_snapshot(
            memory_id=memory_id,
            version_number=1,
            text_snapshot=req.text,
            category_snapshot=category.value,
            privacy_snapshot=privacy.value,
            source_device_id=device,
            source_trust=req.source_trust,
            change_reason="Initial creation",
            is_current=True
        )

        # Enqueue Sync Job if eligible
        if priority is not None and sync_state == SyncState.PENDING:
            idempotency_key = f"{memory_id}-v1-create"
            self.db.enqueue_sync_job(
                memory_id=memory_id,
                operation=SyncOperation.CREATE.value,
                priority=priority.value,
                idempotency_key=idempotency_key
            )
            # Record Sync Queued event
            self.db.record_activity(
                event_type=ActivityEventType.SYNC_QUEUED.value,
                actor_device_id=device,
                memory_id=memory_id,
                details={
                    "operation": "create",
                    "priority": priority.value,
                    "category": category.value,
                    "privacy": privacy.value
                }
            )
        elif privacy == PrivacyLevel.LOCAL_ONLY or category == MemoryCategory.PRIVATE:
            # Record Blocked Private event (redacted text)
            self.db.record_activity(
                event_type=ActivityEventType.SYNC_BLOCKED_PRIVATE.value,
                actor_device_id=device,
                memory_id=memory_id,
                details={
                    "reason": "Memory marked private/local-only; cloud sync prevented by policy",
                    "category": category.value,
                    "privacy": privacy.value
                }
            )

        # Record Memory Created event
        self.db.record_activity(
            event_type=ActivityEventType.MEMORY_CREATED.value,
            actor_device_id=device,
            memory_id=memory_id,
            details={
                "category": category.value,
                "privacy": privacy.value,
                "tags": req.tags,
                "embedding_success": not embedding_failed,
                "text": req.text
            }
        )

        return saved_memory

    def get_memory(self, memory_id: str) -> dict[str, Any]:
        mem = self.db.get_memory(memory_id)
        if not mem:
            raise NotFoundError("MEMORY_NOT_FOUND", f"Memory with ID '{memory_id}' was not found.")
        return mem

    def list_memories(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        privacy: Optional[str] = None,
        sync_state: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> tuple[list[dict[str, Any]], int]:
        offset = (page - 1) * page_size
        return self.db.list_memories(
            category=category,
            status=status,
            privacy=privacy,
            sync_state=sync_state,
            search_query=search_query,
            limit=page_size,
            offset=offset
        )

    def update_memory(self, memory_id: str, req: MemoryUpdate, actor_device_id: Optional[str] = None) -> dict[str, Any]:
        current = self.get_memory(memory_id)
        device = actor_device_id or self.device_id
        now_iso = datetime.now(timezone.utc).isoformat()

        if current["status"] == MemoryStatus.DELETED.value:
            raise ConflictError("MEMORY_DELETED", "Cannot update a deleted memory.")

        updates: dict[str, Any] = {"updated_at": now_iso}
        text_changed = False
        new_text = current["text"]
        new_category = current["category"]
        new_privacy = current["privacy"]

        if req.text is not None and req.text != current["text"]:
            updates["text"] = req.text
            new_text = req.text
            text_changed = True

        if req.category is not None:
            new_category = req.category.value
            updates["category"] = new_category

        if req.privacy is not None:
            new_privacy = req.privacy.value
            updates["privacy"] = new_privacy

        if req.tags is not None:
            updates["tags"] = req.tags

        # Invariant: If category is private, force local_only
        if new_category == MemoryCategory.PRIVATE.value:
            new_privacy = PrivacyLevel.LOCAL_ONLY.value
            updates["privacy"] = new_privacy

        # Increment version number
        new_version = current["version"] + 1
        updates["version"] = new_version

        # Privacy Transition Safeguard: If transitioning to private/local-only, block pending jobs immediately!
        was_sync_allowed = (current["privacy"] == PrivacyLevel.SYNC_ALLOWED.value and current["category"] != MemoryCategory.PRIVATE.value)
        is_now_private = (new_privacy == PrivacyLevel.LOCAL_ONLY.value or new_category == MemoryCategory.PRIVATE.value)

        if is_now_private:
            updates["sync_state"] = SyncState.LOCAL_ONLY.value
            blocked_count = self.db.block_sync_jobs_for_memory(
                memory_id=memory_id,
                reason="Policy change: memory updated to private/local_only"
            )
            if blocked_count > 0:
                self.db.record_activity(
                    event_type=ActivityEventType.SYNC_BLOCKED_PRIVATE.value,
                    actor_device_id=device,
                    memory_id=memory_id,
                    details={
                        "reason": f"Blocked {blocked_count} pending sync jobs due to privacy transition",
                        "previous_privacy": current["privacy"],
                        "new_privacy": new_privacy
                    }
                )

        # Regenerate embedding if text changed
        if text_changed:
            try:
                vector = self.embedding.embed_text(new_text)
                self.vector_store.upsert(
                    point_id=memory_id,
                    vector=vector,
                    payload={
                        "memory_id": memory_id,
                        "device_id": current["device_id"],
                        "text": new_text,
                        "category": new_category,
                        "privacy": new_privacy,
                        "status": current["status"],
                        "tags": updates.get("tags", current["tags"]),
                        "updated_at": now_iso
                    }
                )
                updates["embedding_ref"] = memory_id
            except Exception as e:
                print(f"Warning: Failed to update vector for memory {memory_id}: {e}")

        # Update SQLite record
        updated_memory = self.db.update_memory(memory_id, updates)

        # Create Version Snapshot
        self.db.create_version_snapshot(
            memory_id=memory_id,
            version_number=new_version,
            text_snapshot=new_text,
            category_snapshot=new_category,
            privacy_snapshot=new_privacy,
            source_device_id=device,
            source_trust=current["source_trust"],
            change_reason=req.change_reason or "Memory updated",
            is_current=True
        )

        # Enqueue update sync job if eligible
        if not is_now_private:
            priority = SyncJobPriority.HIGH if new_category == MemoryCategory.IMPORTANT.value else SyncJobPriority.NORMAL
            idempotency_key = f"{memory_id}-v{new_version}-update"
            self.db.enqueue_sync_job(
                memory_id=memory_id,
                operation=SyncOperation.UPDATE.value,
                priority=priority.value,
                idempotency_key=idempotency_key
            )
            self.db.update_memory(memory_id, {"sync_state": SyncState.PENDING.value})

        # Record activity event
        self.db.record_activity(
            event_type=ActivityEventType.MEMORY_UPDATED.value,
            actor_device_id=device,
            memory_id=memory_id,
            details={
                "version": new_version,
                "text_changed": text_changed,
                "category": new_category,
                "privacy": new_privacy,
                "text": new_text
            }
        )

        return updated_memory # type: ignore

    def archive_memory(self, memory_id: str, actor_device_id: Optional[str] = None) -> dict[str, Any]:
        current = self.get_memory(memory_id)
        device = actor_device_id or self.device_id
        now_iso = datetime.now(timezone.utc).isoformat()

        updates = {
            "status": MemoryStatus.ARCHIVED.value,
            "updated_at": now_iso
        }
        updated = self.db.update_memory(memory_id, updates)

        # Enqueue archive sync job if eligible
        if current["privacy"] == PrivacyLevel.SYNC_ALLOWED.value and current["category"] != MemoryCategory.PRIVATE.value:
            idempotency_key = f"{memory_id}-v{current['version']}-archive"
            self.db.enqueue_sync_job(
                memory_id=memory_id,
                operation=SyncOperation.ARCHIVE.value,
                priority=SyncJobPriority.LOW.value,
                idempotency_key=idempotency_key
            )

        self.db.record_activity(
            event_type=ActivityEventType.MEMORY_ARCHIVED.value,
            actor_device_id=device,
            memory_id=memory_id,
            details={"status": "archived"}
        )
        return updated # type: ignore

    def delete_memory(self, memory_id: str, actor_device_id: Optional[str] = None) -> dict[str, Any]:
        current = self.get_memory(memory_id)
        device = actor_device_id or self.device_id

        # Remove immediately from local vector search index
        self.vector_store.delete(memory_id)

        # Mark as tombstone in SQLite
        self.db.delete_memory_tombstone(memory_id)

        # If it was sync-allowed and synced/pending, enqueue delete tombstone job
        if current["privacy"] == PrivacyLevel.SYNC_ALLOWED.value and current["category"] != MemoryCategory.PRIVATE.value:
            idempotency_key = f"{memory_id}-tombstone-delete"
            self.db.enqueue_sync_job(
                memory_id=memory_id,
                operation=SyncOperation.DELETE.value,
                priority=SyncJobPriority.NORMAL.value,
                idempotency_key=idempotency_key
            )

        self.db.record_activity(
            event_type=ActivityEventType.MEMORY_DELETED.value,
            actor_device_id=device,
            memory_id=memory_id,
            details={"status": "deleted", "tombstone": True}
        )
        return {"id": memory_id, "status": "deleted", "message": "Memory deleted with tombstone recorded"}

    def restore_memory(self, memory_id: str, actor_device_id: Optional[str] = None) -> dict[str, Any]:
        current = self.get_memory(memory_id)
        device = actor_device_id or self.device_id
        now_iso = datetime.now(timezone.utc).isoformat()

        updates = {
            "status": MemoryStatus.ACTIVE.value,
            "updated_at": now_iso
        }
        updated = self.db.update_memory(memory_id, updates)

        # Re-index in local vector store
        try:
            vector = self.embedding.embed_text(current["text"])
            self.vector_store.upsert(
                point_id=memory_id,
                vector=vector,
                payload={
                    "memory_id": memory_id,
                    "device_id": current["device_id"],
                    "text": current["text"],
                    "category": current["category"],
                    "privacy": current["privacy"],
                    "status": MemoryStatus.ACTIVE.value,
                    "tags": current["tags"],
                    "updated_at": now_iso
                }
            )
        except Exception as e:
            print(f"Warning: Failed to re-index restored memory: {e}")

        self.db.record_activity(
            event_type=ActivityEventType.MEMORY_RESTORED.value,
            actor_device_id=device,
            memory_id=memory_id,
            details={"status": "restored"}
        )
        return updated # type: ignore

    def get_memory_versions(self, memory_id: str) -> list[dict[str, Any]]:
        self.get_memory(memory_id) # verify existence
        return self.db.list_memory_versions(memory_id)
