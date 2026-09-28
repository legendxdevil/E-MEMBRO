from fastapi import APIRouter, Depends, Request
from app.schemas.schemas import SearchRequest, SearchResponse
from app.services.search_service import SearchService
from app.core.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/v1/search", tags=["search"])

def get_search_service() -> SearchService:
    return SearchService()

@router.post("", response_model=SearchResponse)
def semantic_search(
    req: SearchRequest,
    request: Request,
    service: SearchService = Depends(get_search_service)
):
    rate_limiter.check_rate_limit(request, "read")
    device_id = request.headers.get("x-device-id")
    return service.semantic_search(req, actor_device_id=device_id)
