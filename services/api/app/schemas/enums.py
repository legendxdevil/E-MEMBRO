from enum import Enum

class MemoryCategory(str, Enum):
    IMPORTANT = "important"
    NORMAL = "normal"
    PRIVATE = "private"

class PrivacyLevel(str, Enum):
    SYNC_ALLOWED = "sync_allowed"
    LOCAL_ONLY = "local_only"

class MemoryStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    SUPERSEDED = "superseded"
    DELETED = "deleted"

class SyncState(str, Enum):
    LOCAL_ONLY = "local_only"
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    FAILED = "failed"
    BLOCKED = "blocked"

class MemorySource(str, Enum):
    MANUAL = "manual"
    IMPORTED = "imported"
    DEVICE_EVENT = "device_event"
    CLOUD = "cloud"

class SyncOperation(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    ARCHIVE = "archive"
    DELETE = "delete"

class SyncJobPriority(str, Enum):
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"

class SyncJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    BLOCKED = "blocked"

class ConflictType(str, Enum):
    CONTRADICTION_CANDIDATE = "contradiction_candidate"
    CONCURRENT_UPDATE = "concurrent_update"
    DUPLICATE = "duplicate"

class ConflictState(str, Enum):
    CANDIDATE = "candidate"
    RESOLVED = "resolved"
    NEEDS_REVIEW = "needs_review"
    DISMISSED = "dismissed"

class ConflictDecision(str, Enum):
    A_WINS = "a_wins"
    B_WINS = "b_wins"
    NEEDS_REVIEW = "needs_review"
    DISMISSED = "dismissed"

class ActivityEventType(str, Enum):
    MEMORY_CREATED = "memory.created"
    MEMORY_UPDATED = "memory.updated"
    MEMORY_ARCHIVED = "memory.archived"
    MEMORY_DELETED = "memory.deleted"
    MEMORY_RESTORED = "memory.restored"
    SEARCH_COMPLETED = "search.completed"
    SYNC_QUEUED = "sync.queued"
    SYNC_STARTED = "sync.started"
    SYNC_SUCCEEDED = "sync.succeeded"
    SYNC_FAILED = "sync.failed"
    SYNC_BLOCKED_PRIVATE = "sync.blocked_private"
    CONFLICT_DETECTED = "conflict.detected"
    CONFLICT_RESOLVED = "conflict.resolved"
    CONFLICT_NEEDS_REVIEW = "conflict.needs_review"
    NETWORK_STATUS_CHANGED = "network.status_changed"
    SYNC_SETTING_CHANGED = "sync.setting_changed"
