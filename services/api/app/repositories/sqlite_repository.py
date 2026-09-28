import sqlite3
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
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
    SyncJobStatus,
    ConflictType,
    ConflictState,
    ConflictDecision,
    ActivityEventType,
)

class SQLiteRepository:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.SQLITE_DB_PATH
        # Ensure parent directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def init_db(self) -> None:
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Memories Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                text TEXT NOT NULL,
                embedding_ref TEXT,
                category TEXT NOT NULL,
                privacy TEXT NOT NULL,
                tags TEXT NOT NULL,
                source TEXT NOT NULL,
                source_trust INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'active',
                sync_state TEXT NOT NULL DEFAULT 'pending',
                supersedes TEXT,
                conflict_group_id TEXT
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_sync_state ON memories(sync_state);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);")

            # 2. Memory Versions Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS memory_versions (
                id TEXT PRIMARY KEY,
                memory_id TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                text_snapshot TEXT NOT NULL,
                category_snapshot TEXT NOT NULL,
                privacy_snapshot TEXT NOT NULL,
                source_device_id TEXT NOT NULL,
                source_trust INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                change_reason TEXT NOT NULL,
                is_current INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(memory_id) REFERENCES memories(id) ON DELETE CASCADE
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_versions_memory_id ON memory_versions(memory_id);")

            # 3. Sync Jobs Table (Durable Queue)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_jobs (
                id TEXT PRIMARY KEY,
                memory_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                attempt_count INTEGER NOT NULL DEFAULT 0,
                next_attempt_at TEXT,
                last_error TEXT,
                idempotency_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(memory_id) REFERENCES memories(id) ON DELETE CASCADE
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_prio ON sync_jobs(status, priority, created_at);")

            # 4. Conflict Records Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conflict_records (
                id TEXT PRIMARY KEY,
                memory_a_id TEXT NOT NULL,
                memory_b_id TEXT NOT NULL,
                conflict_type TEXT NOT NULL,
                state TEXT NOT NULL,
                decision TEXT NOT NULL,
                decision_reason TEXT NOT NULL,
                resolved_memory_id TEXT,
                created_at TEXT NOT NULL,
                resolved_at TEXT,
                FOREIGN KEY(memory_a_id) REFERENCES memories(id) ON DELETE CASCADE,
                FOREIGN KEY(memory_b_id) REFERENCES memories(id) ON DELETE CASCADE
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_conflicts_state ON conflict_records(state);")

            # 5. Activity Events Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                actor_device_id TEXT NOT NULL,
                memory_id TEXT,
                sync_job_id TEXT,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_events(created_at);")

            # 6. Devices Registry Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                sync_status TEXT NOT NULL,
                registered_at TEXT NOT NULL,
                is_revoked INTEGER NOT NULL DEFAULT 0,
                app_version TEXT NOT NULL
            );
            """)

            # 7. Sync Acknowledgements Table (for idempotency tracking)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_acknowledgements (
                id TEXT PRIMARY KEY,
                batch_id TEXT NOT NULL,
                idempotency_key TEXT NOT NULL UNIQUE,
                device_id TEXT NOT NULL,
                memory_ids TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)

            # 8. Runtime Settings / Simulator State Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """)

            # Ensure default active device exists
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
            INSERT OR IGNORE INTO devices (id, name, device_type, last_seen, sync_status, registered_at, is_revoked, app_version)
            VALUES (?, ?, ?, ?, 'online', ?, 0, ?)
            """, (settings.DEVICE_ID, settings.DEVICE_NAME, settings.DEVICE_TYPE, now_iso, now_iso, settings.APP_VERSION))

            # Also pre-register Device B for conflict demos
            dev_b_id = "00000000-0000-0000-0000-000000000002"
            cursor.execute("""
            INSERT OR IGNORE INTO devices (id, name, device_type, last_seen, sync_status, registered_at, is_revoked, app_version)
            VALUES (?, 'Edge Node Beta (Device B)', 'edge_device', ?, 'online', ?, 0, ?)
            """, (dev_b_id, now_iso, now_iso, settings.APP_VERSION))

            conn.commit()

    # --- Setting State helpers ---
    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT value FROM settings_state WHERE key = ?", (key,)).fetchone()
            return row["value"] if row else default

    def set_setting(self, key: str, value: str) -> None:
        with self.get_connection() as conn:
            conn.execute("INSERT INTO settings_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, value))
            conn.commit()

    # --- Memory Operations ---
    def create_memory(self, memory_data: dict[str, Any]) -> dict[str, Any]:
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO memories (
                id, device_id, text, embedding_ref, category, privacy, tags,
                source, source_trust, created_at, updated_at, version, status,
                sync_state, supersedes, conflict_group_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                memory_data["id"],
                memory_data["device_id"],
                memory_data["text"],
                memory_data.get("embedding_ref"),
                memory_data["category"],
                memory_data["privacy"],
                json.dumps(memory_data.get("tags", [])),
                memory_data["source"],
                memory_data.get("source_trust", 1),
                memory_data["created_at"],
                memory_data["updated_at"],
                memory_data.get("version", 1),
                memory_data.get("status", MemoryStatus.ACTIVE.value),
                memory_data.get("sync_state", SyncState.PENDING.value),
                memory_data.get("supersedes"),
                memory_data.get("conflict_group_id")
            ))
            conn.commit()
        return self.get_memory(memory_data["id"]) # type: ignore

    def get_memory(self, memory_id: str) -> Optional[dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
            if not row:
                return None
            data = dict(row)
            data["tags"] = json.loads(data["tags"])
            return data

    def list_memories(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        privacy: Optional[str] = None,
        sync_state: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[dict[str, Any]], int]:
        with self.get_connection() as conn:
            query = "SELECT * FROM memories WHERE 1=1"
            count_query = "SELECT COUNT(*) as count FROM memories WHERE 1=1"
            params: list[Any] = []

            if category:
                query += " AND category = ?"
                count_query += " AND category = ?"
                params.append(category)
            if status:
                query += " AND status = ?"
                count_query += " AND status = ?"
                params.append(status)
            if privacy:
                query += " AND privacy = ?"
                count_query += " AND privacy = ?"
                params.append(privacy)
            if sync_state:
                query += " AND sync_state = ?"
                count_query += " AND sync_state = ?"
                params.append(sync_state)
            if search_query:
                query += " AND text LIKE ?"
                count_query += " AND text LIKE ?"
                params.append(f"%{search_query}%")

            total = conn.execute(count_query, params).fetchone()["count"]

            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            rows = conn.execute(query, params + [limit, offset]).fetchall()

            memories = []
            for r in rows:
                d = dict(r)
                d["tags"] = json.loads(d["tags"])
                memories.append(d)
            return memories, total

    def update_memory(self, memory_id: str, updates: dict[str, Any]) -> Optional[dict[str, Any]]:
        with self.get_connection() as conn:
            fields = []
            values = []
            for k, v in updates.items():
                if k == "tags":
                    fields.append("tags = ?")
                    values.append(json.dumps(v))
                else:
                    fields.append(f"{k} = ?")
                    values.append(v)
            if not fields:
                return self.get_memory(memory_id)

            values.append(memory_id)
            conn.execute(f"UPDATE memories SET {', '.join(fields)} WHERE id = ?", values)
            conn.commit()
        return self.get_memory(memory_id)

    def delete_memory_tombstone(self, memory_id: str) -> bool:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            res = conn.execute("""
            UPDATE memories
            SET status = 'deleted', updated_at = ?
            WHERE id = ?
            """, (now_iso, memory_id))
            conn.commit()
            return res.rowcount > 0

    # --- Version Operations ---
    def create_version_snapshot(
        self,
        memory_id: str,
        version_number: int,
        text_snapshot: str,
        category_snapshot: str,
        privacy_snapshot: str,
        source_device_id: str,
        source_trust: int,
        change_reason: str,
        is_current: bool = True
    ) -> dict[str, Any]:
        version_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            if is_current:
                conn.execute("UPDATE memory_versions SET is_current = 0 WHERE memory_id = ?", (memory_id,))
            conn.execute("""
            INSERT INTO memory_versions (
                id, memory_id, version_number, text_snapshot, category_snapshot,
                privacy_snapshot, source_device_id, source_trust, created_at,
                change_reason, is_current
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                version_id, memory_id, version_number, text_snapshot, category_snapshot,
                privacy_snapshot, source_device_id, source_trust, now_iso,
                change_reason, 1 if is_current else 0
            ))
            conn.commit()
        return {
            "id": version_id,
            "memory_id": memory_id,
            "version_number": version_number,
            "text_snapshot": text_snapshot,
            "category_snapshot": category_snapshot,
            "privacy_snapshot": privacy_snapshot,
            "source_device_id": source_device_id,
            "source_trust": source_trust,
            "created_at": now_iso,
            "change_reason": change_reason,
            "is_current": is_current
        }

    def list_memory_versions(self, memory_id: str) -> list[dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("""
            SELECT * FROM memory_versions
            WHERE memory_id = ?
            ORDER BY version_number DESC
            """, (memory_id,)).fetchall()
            return [dict(r) for r in rows]

    # --- Durable Sync Queue Operations ---
    def enqueue_sync_job(
        self,
        memory_id: str,
        operation: str,
        priority: str,
        idempotency_key: str
    ) -> dict[str, Any]:
        job_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO sync_jobs (
                id, memory_id, operation, priority, status, attempt_count,
                next_attempt_at, last_error, idempotency_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, ?, ?)
            ON CONFLICT(idempotency_key) DO UPDATE SET
                operation = excluded.operation,
                priority = excluded.priority,
                status = 'pending',
                updated_at = excluded.updated_at
            """, (
                job_id, memory_id, operation, priority, idempotency_key, now_iso, now_iso
            ))
            conn.commit()
        return self.get_sync_job_by_key(idempotency_key) # type: ignore

    def get_sync_job_by_key(self, idempotency_key: str) -> Optional[dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM sync_jobs WHERE idempotency_key = ?", (idempotency_key,)).fetchone()
            return dict(row) if row else None

    def get_pending_sync_jobs(self, limit: int = 50) -> list[dict[str, Any]]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            # Sort by priority: high first, then normal, then low, then oldest created_at
            rows = conn.execute("""
            SELECT * FROM sync_jobs
            WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'normal' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END ASC,
                created_at ASC
            LIMIT ?
            """, (now_iso, limit)).fetchall()
            return [dict(r) for r in rows]

    def update_sync_job(self, job_id: str, updates: dict[str, Any]) -> None:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        fields = [f"{k} = ?" for k in updates.keys()]
        values = list(updates.values()) + [job_id]
        with self.get_connection() as conn:
            conn.execute(f"UPDATE sync_jobs SET {', '.join(fields)} WHERE id = ?", values)
            conn.commit()

    def block_sync_jobs_for_memory(self, memory_id: str, reason: str = "Privacy policy change to private/local_only") -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            res = conn.execute("""
            UPDATE sync_jobs
            SET status = 'blocked', last_error = ?, updated_at = ?
            WHERE memory_id = ? AND status IN ('pending', 'processing')
            """, (reason, now_iso, memory_id))
            conn.commit()
            return res.rowcount

    def list_sync_jobs(self, status: Optional[str] = None, limit: int = 100) -> list[dict[str, Any]]:
        with self.get_connection() as conn:
            if status:
                rows = conn.execute("SELECT * FROM sync_jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?", (status, limit)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM sync_jobs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
            return [dict(r) for r in rows]

    # --- Conflict Operations ---
    def create_conflict_record(
        self,
        memory_a_id: str,
        memory_b_id: str,
        conflict_type: str,
        state: str,
        decision: str,
        decision_reason: str,
        resolved_memory_id: Optional[str] = None
    ) -> dict[str, Any]:
        conflict_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO conflict_records (
                id, memory_a_id, memory_b_id, conflict_type, state,
                decision, decision_reason, resolved_memory_id, created_at, resolved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                conflict_id, memory_a_id, memory_b_id, conflict_type, state,
                decision, decision_reason, resolved_memory_id, now_iso,
                now_iso if state == "resolved" else None
            ))
            conn.commit()
        return self.get_conflict_record(conflict_id) # type: ignore

    def get_conflict_record(self, conflict_id: str) -> Optional[dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM conflict_records WHERE id = ?", (conflict_id,)).fetchone()
            if not row:
                return None
            data = dict(row)
            data["memory_a"] = self.get_memory(data["memory_a_id"])
            data["memory_b"] = self.get_memory(data["memory_b_id"])
            return data

    def list_conflicts(self, state: Optional[str] = None) -> list[dict[str, Any]]:
        with self.get_connection() as conn:
            if state:
                rows = conn.execute("SELECT * FROM conflict_records WHERE state = ? ORDER BY created_at DESC", (state,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM conflict_records ORDER BY created_at DESC").fetchall()
            conflicts = []
            for r in rows:
                d = dict(r)
                d["memory_a"] = self.get_memory(d["memory_a_id"])
                d["memory_b"] = self.get_memory(d["memory_b_id"])
                conflicts.append(d)
            return conflicts

    def resolve_conflict(self, conflict_id: str, decision: str, decision_reason: str, resolved_memory_id: Optional[str] = None) -> Optional[dict[str, Any]]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            UPDATE conflict_records
            SET state = 'resolved', decision = ?, decision_reason = ?, resolved_memory_id = ?, resolved_at = ?
            WHERE id = ?
            """, (decision, decision_reason, resolved_memory_id, now_iso, conflict_id))
            conn.commit()
        return self.get_conflict_record(conflict_id)

    # --- Activity Event Operations ---
    def record_activity(
        self,
        event_type: str,
        actor_device_id: str,
        memory_id: Optional[str] = None,
        sync_job_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        event_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        # Privacy safeguard: Sanitize details to avoid logging sensitive private memory text
        clean_details = dict(details or {})
        if "text" in clean_details:
            # Truncate or redact if private
            if clean_details.get("privacy") == "local_only" or clean_details.get("category") == "private":
                clean_details["text"] = "[REDACTED_PRIVATE_CONTENT]"
            else:
                clean_details["text"] = clean_details["text"][:100] + ("..." if len(clean_details["text"]) > 100 else "")

        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO activity_events (
                id, event_type, actor_device_id, memory_id, sync_job_id, details, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, event_type, actor_device_id, memory_id, sync_job_id,
                json.dumps(clean_details), now_iso
            ))
            conn.commit()
        return {
            "id": event_id,
            "event_type": event_type,
            "actor_device_id": actor_device_id,
            "memory_id": memory_id,
            "sync_job_id": sync_job_id,
            "details": clean_details,
            "created_at": now_iso
        }

    def list_activity(self, limit: int = 100, event_type: Optional[str] = None) -> list[dict[str, Any]]:
        with self.get_connection() as conn:
            if event_type:
                rows = conn.execute("SELECT * FROM activity_events WHERE event_type = ? ORDER BY created_at DESC LIMIT ?", (event_type, limit)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM activity_events ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
            events = []
            for r in rows:
                d = dict(r)
                d["details"] = json.loads(d["details"])
                events.append(d)
            return events

    # --- Device Operations ---
    def register_device(self, device_id: str, name: str, device_type: str, app_version: str) -> dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO devices (id, name, device_type, last_seen, sync_status, registered_at, is_revoked, app_version)
            VALUES (?, ?, ?, ?, 'online', ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                device_type = excluded.device_type,
                last_seen = excluded.last_seen,
                app_version = excluded.app_version
            """, (device_id, name, device_type, now_iso, now_iso, app_version))
            conn.commit()
        return self.get_device(device_id) # type: ignore

    def get_device(self, device_id: str) -> Optional[dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
            return dict(row) if row else None

    def list_devices(self) -> list[dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM devices ORDER BY last_seen DESC").fetchall()
            return [dict(r) for r in rows]

    def update_device_heartbeat(self, device_id: str) -> None:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            conn.execute("UPDATE devices SET last_seen = ? WHERE id = ?", (now_iso, device_id))
            conn.commit()

    # --- Sync Acknowledgements ---
    def record_sync_ack(self, batch_id: str, idempotency_key: str, device_id: str, memory_ids: list[str]) -> bool:
        ack_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            with self.get_connection() as conn:
                conn.execute("""
                INSERT INTO sync_acknowledgements (id, batch_id, idempotency_key, device_id, memory_ids, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, (ack_id, batch_id, idempotency_key, device_id, json.dumps(memory_ids), now_iso))
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            # Duplicate idempotency key!
            return False

    def is_sync_idempotent(self, idempotency_key: str) -> bool:
        with self.get_connection() as conn:
            row = conn.execute("SELECT id FROM sync_acknowledgements WHERE idempotency_key = ?", (idempotency_key,)).fetchone()
            return row is not None

    # --- System Metrics ---
    def get_metrics(self) -> dict[str, Any]:
        with self.get_connection() as conn:
            active_count = conn.execute("SELECT COUNT(*) as c FROM memories WHERE status = 'active'").fetchone()["c"]
            important_count = conn.execute("SELECT COUNT(*) as c FROM memories WHERE category = 'important' AND status = 'active'").fetchone()["c"]
            normal_count = conn.execute("SELECT COUNT(*) as c FROM memories WHERE category = 'normal' AND status = 'active'").fetchone()["c"]
            private_count = conn.execute("SELECT COUNT(*) as c FROM memories WHERE (category = 'private' OR privacy = 'local_only') AND status = 'active'").fetchone()["c"]
            archived_count = conn.execute("SELECT COUNT(*) as c FROM memories WHERE status = 'archived'").fetchone()["c"]
            superseded_count = conn.execute("SELECT COUNT(*) as c FROM memories WHERE status = 'superseded'").fetchone()["c"]

            pending_jobs = conn.execute("SELECT COUNT(*) as c FROM sync_jobs WHERE status = 'pending'").fetchone()["c"]
            failed_jobs = conn.execute("SELECT COUNT(*) as c FROM sync_jobs WHERE status = 'failed'").fetchone()["c"]
            succeeded_jobs = conn.execute("SELECT COUNT(*) as c FROM sync_jobs WHERE status = 'succeeded'").fetchone()["c"]

            open_conflicts = conn.execute("SELECT COUNT(*) as c FROM conflict_records WHERE state IN ('candidate', 'needs_review')").fetchone()["c"]
            resolved_conflicts = conn.execute("SELECT COUNT(*) as c FROM conflict_records WHERE state = 'resolved'").fetchone()["c"]

            search_events = conn.execute("""
            SELECT details FROM activity_events WHERE event_type = 'search.completed' ORDER BY created_at DESC LIMIT 50
            """).fetchall()

            latencies = []
            for ev in search_events:
                try:
                    d = json.loads(ev["details"])
                    if "latency_ms" in d:
                        latencies.append(float(d["latency_ms"]))
                except Exception:
                    pass

            last_latency = latencies[0] if latencies else 0.0
            avg_latency = (sum(latencies) / len(latencies)) if latencies else 0.0

            return {
                "total_active_memories": active_count,
                "important_memories_count": important_count,
                "normal_memories_count": normal_count,
                "private_memories_count": private_count,
                "archived_memories_count": archived_count,
                "superseded_memories_count": superseded_count,
                "pending_sync_jobs": pending_jobs,
                "failed_sync_jobs": failed_jobs,
                "total_sync_completed": succeeded_jobs,
                "open_conflicts_count": open_conflicts,
                "resolved_conflicts_count": resolved_conflicts,
                "last_search_latency_ms": round(last_latency, 2),
                "average_search_latency_ms": round(avg_latency, 2),
                "total_searches_performed": len(latencies)
            }
