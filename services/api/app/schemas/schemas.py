from typing import Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator
import uuid

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

# Standard Error Schema
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict[str, Any]] = Field(default_factory=dict)
    request_id: str

class ErrorResponse(BaseModel):
    error: ErrorDetail


# Memory Schemas
class MemoryCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Memory content")
    category: MemoryCategory = Field(default=MemoryCategory.NORMAL)
    privacy: PrivacyLevel = Field(default=PrivacyLevel.SYNC_ALLOWED)
    tags: list[str] = Field(default_factory=list)
    source: MemorySource = Field(default=MemorySource.MANUAL)
    source_trust: int = Field(default=1, ge=0, le=10)

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Memory text cannot be empty or whitespace only")
        return trimmed

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        if len(v) > 20:
            raise ValueError("Maximum 20 tags permitted")
        clean_tags = []
        for tag in v:
            clean = tag.strip().lower()
            if clean and len(clean) <= 50:
                if clean not in clean_tags:
                    clean_tags.append(clean)
        return clean_tags


class MemoryUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=10000)
    category: Optional[MemoryCategory] = None
    privacy: Optional[PrivacyLevel] = None
    tags: Optional[list[str]] = None
    change_reason: Optional[str] = Field(default="User update", max_length=500)

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Memory text cannot be empty or whitespace only")
            return trimmed
        return v


class MemoryResponse(BaseModel):
    id: str
    device_id: str
    text: str
    embedding_ref: Optional[str] = None
    category: MemoryCategory
    privacy: PrivacyLevel
    tags: list[str]
    source: MemorySource
    source_trust: int
    created_at: str
    updated_at: str
    version: int
    status: MemoryStatus
    sync_state: SyncState
    supersedes: Optional[str] = None
    conflict_group_id: Optional[str] = None


class MemoryListResponse(BaseModel):
    memories: list[MemoryResponse]
    total: int
    page: int
    page_size: int


# Memory Version
class MemoryVersionResponse(BaseModel):
    id: str
    memory_id: str
    version_number: int
    text_snapshot: str
    category_snapshot: MemoryCategory
    privacy_snapshot: PrivacyLevel
    source_device_id: str
    source_trust: int
    created_at: str
    change_reason: str
    is_current: bool


# Search Schemas
class SearchFilter(BaseModel):
    category: Optional[list[MemoryCategory]] = None
    status: Optional[list[MemoryStatus]] = None
    tags: Optional[list[str]] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    limit: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.35, ge=0.0, le=1.0)
    filters: Optional[SearchFilter] = None

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Query string cannot be empty")
        return trimmed


class SearchResultItem(BaseModel):
    memory_id: str
    text: str
    score: float
    category: MemoryCategory
    privacy: PrivacyLevel
    created_at: str
    updated_at: str
    tags: list[str]
    status: MemoryStatus


class SearchResponse(BaseModel):
    offline: bool
    query: str
    total_results: int
    results: list[SearchResultItem]
    latency_ms: float


# Sync Schemas
class SyncItem(BaseModel):
    memory_id: str
    operation: SyncOperation
    version: int
    category: MemoryCategory
    privacy: PrivacyLevel
    text: str
    tags: list[str] = Field(default_factory=list)
    source_trust: int = 1
    created_at: str
    updated_at: str


class SyncBatchRequest(BaseModel):
    device_id: str
    idempotency_key: str
    items: list[SyncItem] = Field(..., max_length=100)


class SyncBatchResponse(BaseModel):
    accepted: list[str]
    rejected: list[dict[str, Any]]
    server_time: str
    conflicts_detected: int = 0
    idempotent_replay: Optional[bool] = False


class SyncJobResponse(BaseModel):
    id: str
    memory_id: str
    operation: SyncOperation
    priority: SyncJobPriority
    status: SyncJobStatus
    attempt_count: int
    next_attempt_at: Optional[str]
    last_error: Optional[str]
    idempotency_key: str
    created_at: str
    updated_at: str


class SyncStatusResponse(BaseModel):
    is_online: bool
    sync_enabled: bool
    offline_simulation: bool
    circuit_breaker_open: bool
    pending_jobs_count: int
    failed_jobs_count: int
    succeeded_jobs_count: int
    blocked_private_count: int
    last_sync_time: Optional[str]
    active_device_id: str


# Conflict Schemas
class ConflictRecordResponse(BaseModel):
    id: str
    memory_a_id: str
    memory_b_id: str
    conflict_type: ConflictType
    state: ConflictState
    decision: ConflictDecision
    decision_reason: str
    resolved_memory_id: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None
    memory_a: Optional[MemoryResponse] = None
    memory_b: Optional[MemoryResponse] = None


class ConflictResolveRequest(BaseModel):
    decision: ConflictDecision
    decision_reason: str = Field(..., min_length=1, max_length=1000)
    resolved_memory_id: Optional[str] = None


# Device Schemas
class DeviceRegisterRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    device_type: str = Field(default="edge_device", max_length=50)
    app_version: str = Field(default="1.0.0", max_length=20)


class DeviceResponse(BaseModel):
    id: str
    name: str
    device_type: str
    last_seen: str
    sync_status: str
    registered_at: str
    is_revoked: bool
    app_version: str


# Activity Schemas
class ActivityEventResponse(BaseModel):
    id: str
    event_type: ActivityEventType
    actor_device_id: str
    memory_id: Optional[str] = None
    sync_job_id: Optional[str] = None
    details: dict[str, Any]
    created_at: str


# Metrics Response
class MetricsResponse(BaseModel):
    total_active_memories: int
    important_memories_count: int
    normal_memories_count: int
    private_memories_count: int
    archived_memories_count: int
    superseded_memories_count: int
    pending_sync_jobs: int
    failed_sync_jobs: int
    total_sync_completed: int
    open_conflicts_count: int
    resolved_conflicts_count: int
    last_search_latency_ms: float
    average_search_latency_ms: float
    total_searches_performed: int
    is_online: bool
    offline_simulation: bool
