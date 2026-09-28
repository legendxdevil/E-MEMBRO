from typing import Optional
from fastapi import APIRouter, Depends, Request, Query, status
from app.schemas.schemas import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemoryListResponse,
    MemoryVersionResponse,
)
from app.schemas.enums import MemoryCategory, MemoryStatus, PrivacyLevel, SyncState
from app.services.memory_service import MemoryService
from app.core.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/v1/memories", tags=["memories"])

def get_memory_service() -> MemoryService:
    return MemoryService()

@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    req: MemoryCreate,
    request: Request,
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "write")
    device_id = request.headers.get("x-device-id")
    saved = service.create_memory(req, actor_device_id=device_id)
    return saved

@router.get("", response_model=MemoryListResponse)
def list_memories(
    request: Request,
    category: Optional[MemoryCategory] = None,
    status: Optional[MemoryStatus] = None,
    privacy: Optional[PrivacyLevel] = None,
    sync_state: Optional[SyncState] = None,
    q: Optional[str] = Query(None, description="Keyword search filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "read")
    memories, total = service.list_memories(
        category=category.value if category else None,
        status=status.value if status else None,
        privacy=privacy.value if privacy else None,
        sync_state=sync_state.value if sync_state else None,
        search_query=q,
        page=page,
        page_size=page_size
    )
    return MemoryListResponse(
        memories=memories,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/{memory_id}", response_model=MemoryResponse)
def get_memory(
    memory_id: str,
    request: Request,
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "read")
    return service.get_memory(memory_id)

@router.patch("/{memory_id}", response_model=MemoryResponse)
def update_memory(
    memory_id: str,
    req: MemoryUpdate,
    request: Request,
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "write")
    device_id = request.headers.get("x-device-id")
    return service.update_memory(memory_id, req, actor_device_id=device_id)

@router.post("/{memory_id}/archive", response_model=MemoryResponse)
def archive_memory(
    memory_id: str,
    request: Request,
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "write")
    device_id = request.headers.get("x-device-id")
    return service.archive_memory(memory_id, actor_device_id=device_id)

@router.post("/{memory_id}/restore", response_model=MemoryResponse)
def restore_memory(
    memory_id: str,
    request: Request,
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "write")
    device_id = request.headers.get("x-device-id")
    return service.restore_memory(memory_id, actor_device_id=device_id)

@router.delete("/{memory_id}")
def delete_memory(
    memory_id: str,
    request: Request,
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "write")
    device_id = request.headers.get("x-device-id")
    return service.delete_memory(memory_id, actor_device_id=device_id)

@router.get("/{memory_id}/versions", response_model=list[MemoryVersionResponse])
def get_memory_versions(
    memory_id: str,
    request: Request,
    service: MemoryService = Depends(get_memory_service)
):
    rate_limiter.check_rate_limit(request, "read")
    return service.get_memory_versions(memory_id)
