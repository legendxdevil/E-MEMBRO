from typing import Optional
from fastapi import APIRouter, Depends, Request
from app.schemas.schemas import ConflictRecordResponse, ConflictResolveRequest
from app.schemas.enums import ConflictState
from app.services.conflict_service import ConflictService
from app.core.rate_limiter import rate_limiter
from app.core.errors import NotFoundError

router = APIRouter(prefix="/api/v1/conflicts", tags=["conflicts"])

def get_conflict_service() -> ConflictService:
    return ConflictService()

@router.get("", response_model=list[ConflictRecordResponse])
def list_conflicts(
    request: Request,
    state: Optional[ConflictState] = None,
    service: ConflictService = Depends(get_conflict_service)
):
    rate_limiter.check_rate_limit(request, "read")
    conflicts = service.db.list_conflicts(state=state.value if state else None)
    return conflicts

@router.get("/{conflict_id}", response_model=ConflictRecordResponse)
def get_conflict(
    conflict_id: str,
    request: Request,
    service: ConflictService = Depends(get_conflict_service)
):
    rate_limiter.check_rate_limit(request, "read")
    record = service.db.get_conflict_record(conflict_id)
    if not record:
        raise NotFoundError("CONFLICT_NOT_FOUND", f"Conflict record '{conflict_id}' was not found.")
    return record

@router.post("/{conflict_id}/resolve", response_model=ConflictRecordResponse)
def resolve_conflict(
    conflict_id: str,
    req: ConflictResolveRequest,
    request: Request,
    service: ConflictService = Depends(get_conflict_service)
):
    rate_limiter.check_rate_limit(request, "write")
    resolved = service.resolve_manual(
        conflict_id=conflict_id,
        decision=req.decision,
        decision_reason=req.decision_reason,
        resolved_memory_id=req.resolved_memory_id
    )
    return resolved
