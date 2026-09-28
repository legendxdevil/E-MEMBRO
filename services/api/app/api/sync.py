from typing import Optional, Any
from fastapi import APIRouter, Depends, Request, Query, status
from pydantic import BaseModel
from app.schemas.schemas import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncStatusResponse,
    SyncJobResponse,
)
from app.schemas.enums import SyncJobStatus
from app.services.sync_service import SyncService
from app.core.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/v1/sync", tags=["sync"])

def get_sync_service() -> SyncService:
    return SyncService()

class SimulationToggleRequest(BaseModel):
    offline: bool

class SyncToggleRequest(BaseModel):
    enabled: bool

@router.post("/batch", response_model=SyncBatchResponse)
def sync_batch(
    req: SyncBatchRequest,
    request: Request,
    service: SyncService = Depends(get_sync_service)
):
    rate_limiter.check_rate_limit(request, "sync")
    result = service.process_incoming_sync_batch(req)
    return result

@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status(
    request: Request,
    service: SyncService = Depends(get_sync_service)
):
    rate_limiter.check_rate_limit(request, "read")
    return service.get_sync_status()

@router.post("/process")
def process_sync_queue(
    request: Request,
    service: SyncService = Depends(get_sync_service)
):
    rate_limiter.check_rate_limit(request, "sync")
    return service.process_sync_queue()

@router.post("/offline-simulation")
def toggle_offline_simulation(
    req: SimulationToggleRequest,
    request: Request,
    service: SyncService = Depends(get_sync_service)
):
    rate_limiter.check_rate_limit(request, "write")
    service.set_offline_simulation(req.offline)
    return {"offline_simulation": req.offline, "message": f"Offline simulation set to {req.offline}"}

@router.post("/toggle")
def toggle_sync(
    req: SyncToggleRequest,
    request: Request,
    service: SyncService = Depends(get_sync_service)
):
    rate_limiter.check_rate_limit(request, "write")
    service.set_sync_enabled(req.enabled)
    return {"sync_enabled": req.enabled, "message": f"Sync enabled set to {req.enabled}"}

@router.get("/jobs", response_model=list[SyncJobResponse])
def list_sync_jobs(
    request: Request,
    status: Optional[SyncJobStatus] = None,
    limit: int = Query(100, ge=1, le=500),
    service: SyncService = Depends(get_sync_service)
):
    rate_limiter.check_rate_limit(request, "read")
    return service.db.list_sync_jobs(status=status.value if status else None, limit=limit)

@router.post("/jobs/{job_id}/retry")
def retry_job(
    job_id: str,
    request: Request,
    service: SyncService = Depends(get_sync_service)
):
    rate_limiter.check_rate_limit(request, "write")
    success = service.retry_job(job_id)
    if not success:
        return {"success": False, "message": f"Job '{job_id}' not found"}
    return {"success": True, "message": f"Job '{job_id}' queued for immediate retry"}
