import uuid
import time
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.core.errors import AppError, RateLimitError
from app.api.memories import router as memories_router
from app.api.search import router as search_router
from app.api.sync import router as sync_router
from app.api.conflicts import router as conflicts_router
from app.api.devices import router as devices_router
from app.api.activity import router as activity_router
from app.api.seed import router as seed_router

from contextlib import asynccontextmanager
from app.repositories.cloud_vector_store import QdrantCloudVectorStore
import logging

logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup connectivity check against Qdrant Cloud store.
    Verifies cluster accessibility via client.get_collections() and logs result.
    """
    logger.info("Initializing E-MEMBRO services and checking Qdrant Cloud connection...")
    try:
        store = QdrantCloudVectorStore()
        if store.client is not None:
            res = store.client.get_collections()
            collection_names = [c.name for c in res.collections]
            msg = f"[OK] [Qdrant Cloud] SUCCESS: Connected to Qdrant Cloud cluster ({settings.QDRANT_CLOUD_URL}). Collections: {collection_names}"
            logger.info(msg)
            print(msg)
        else:
            msg = f"[ERROR] [Qdrant Cloud] FAILURE: Client could not be initialized for {settings.QDRANT_CLOUD_URL}."
            logger.error(msg)
            print(msg)
    except Exception as exc:
        msg = f"[ERROR] [Qdrant Cloud] FAILURE: Unable to connect to Qdrant Cloud cluster at {settings.QDRANT_CLOUD_URL}. Error: {exc}"
        logger.error(msg)
        print(msg)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Offline-first AI memory system that stores on-device, retrieves semantically without internet, selectively syncs, and resolves multi-device conflicts.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Logging Middleware
@app.middleware("http")
async def request_id_and_timing_middleware(request: Request, call_next):
    req_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = req_id
    start_time = time.perf_counter()

    response: Response = await call_next(request)

    duration_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Response-Time-MS"] = f"{duration_ms:.2f}"
    return response

# Custom Application Error Handlers (Section 14 & 18.1)
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    headers = {}
    if isinstance(exc, RateLimitError):
        headers["Retry-After"] = str(exc.retry_after)

    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": req_id
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    errors_summary = []
    for err in exc.errors():
        field_loc = " -> ".join([str(loc) for loc in err.get("loc", [])])
        errors_summary.append({
            "field": field_loc,
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error")
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The incoming payload failed schema or field validation.",
                "details": {"validation_errors": errors_summary},
                "request_id": req_id
            }
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_SERVER_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT"
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code_map.get(exc.status_code, f"HTTP_{exc.status_code}"),
                "message": str(exc.detail),
                "details": {},
                "request_id": req_id
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    # Do not leak internal exception or stack trace to client!
    print(f"Unhandled exception [Request ID: {req_id}]: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred. Please contact system administrator.",
                "details": {},
                "request_id": req_id
            }
        }
    )

# Include Routers
app.include_router(memories_router)
app.include_router(search_router)
app.include_router(sync_router)
app.include_router(conflicts_router)
app.include_router(devices_router)
app.include_router(activity_router)
app.include_router(seed_router)

@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "offline_simulation": settings.OFFLINE_SIMULATION,
        "edge_device_id": settings.DEVICE_ID
    }
