from typing import Optional
from fastapi import APIRouter, Depends, Request, Query
from app.schemas.schemas import ActivityEventResponse, MetricsResponse
from app.schemas.enums import ActivityEventType
from app.repositories.sqlite_repository import SQLiteRepository
from app.core.rate_limiter import rate_limiter
from app.config import settings

router = APIRouter(tags=["activity_and_metrics"])

def get_db() -> SQLiteRepository:
    return SQLiteRepository()

@router.get("/api/v1/activity", response_model=list[ActivityEventResponse])
def list_activity(
    request: Request,
    event_type: Optional[ActivityEventType] = None,
    limit: int = Query(100, ge=1, le=500),
    db: SQLiteRepository = Depends(get_db)
):
    rate_limiter.check_rate_limit(request, "read")
    events = db.list_activity(limit=limit, event_type=event_type.value if event_type else None)
    return events

@router.get("/api/v1/metrics", response_model=MetricsResponse)
def get_metrics(
    request: Request,
    db: SQLiteRepository = Depends(get_db)
):
    rate_limiter.check_rate_limit(request, "read")
    metrics_data = db.get_metrics()
    offline_sim = (db.get_setting("offline_simulation", "false") or "false").lower() == "true"
    is_online = not offline_sim and not settings.OFFLINE_SIMULATION

    return MetricsResponse(
        **metrics_data,
        is_online=is_online,
        offline_simulation=offline_sim
    )
