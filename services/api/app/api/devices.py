import uuid
from fastapi import APIRouter, Depends, Request
from app.schemas.schemas import DeviceRegisterRequest, DeviceResponse
from app.repositories.sqlite_repository import SQLiteRepository
from app.core.rate_limiter import rate_limiter
from app.core.errors import NotFoundError

router = APIRouter(prefix="/api/v1/devices", tags=["devices"])

def get_db() -> SQLiteRepository:
    return SQLiteRepository()

@router.post("/register", response_model=DeviceResponse)
def register_device(
    req: DeviceRegisterRequest,
    request: Request,
    db: SQLiteRepository = Depends(get_db)
):
    rate_limiter.check_rate_limit(request, "write")
    dev_id = req.id or str(uuid.uuid4())
    dev = db.register_device(
        device_id=dev_id,
        name=req.name,
        device_type=req.device_type,
        app_version=req.app_version
    )
    return dev

@router.get("", response_model=list[DeviceResponse])
def list_devices(
    request: Request,
    db: SQLiteRepository = Depends(get_db)
):
    rate_limiter.check_rate_limit(request, "read")
    return db.list_devices()

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: str,
    request: Request,
    db: SQLiteRepository = Depends(get_db)
):
    rate_limiter.check_rate_limit(request, "read")
    dev = db.get_device(device_id)
    if not dev:
        raise NotFoundError("DEVICE_NOT_FOUND", f"Device '{device_id}' was not found.")
    return dev

@router.post("/{device_id}/heartbeat")
def heartbeat(
    device_id: str,
    request: Request,
    db: SQLiteRepository = Depends(get_db)
):
    rate_limiter.check_rate_limit(request, "write")
    dev = db.get_device(device_id)
    if not dev:
        raise NotFoundError("DEVICE_NOT_FOUND", f"Device '{device_id}' was not found.")
    db.update_device_heartbeat(device_id)
    return {"status": "ok", "message": f"Heartbeat recorded for device '{device_id}'"}
