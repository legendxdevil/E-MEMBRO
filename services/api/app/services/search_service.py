import time
from typing import Optional, Any
from app.config import settings
from app.schemas.enums import ActivityEventType, MemoryStatus, MemoryCategory, PrivacyLevel
from app.schemas.schemas import SearchRequest, SearchResponse, SearchResultItem
from app.repositories.sqlite_repository import SQLiteRepository
from app.repositories.edge_vector_store import EdgeVectorStoreAdapter, QdrantEdgeVectorStore
from app.services.embedding_service import EmbeddingService

class SearchService:
    def __init__(
        self,
        db_repo: Optional[SQLiteRepository] = None,
        vector_store: Optional[EdgeVectorStoreAdapter] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        self.db = db_repo or SQLiteRepository()
        self.vector_store = vector_store or QdrantEdgeVectorStore()
        self.embedding = embedding_service or EmbeddingService.get_instance()
        self.device_id = settings.DEVICE_ID

    def semantic_search(self, req: SearchRequest, actor_device_id: Optional[str] = None) -> SearchResponse:
        device = actor_device_id or self.device_id
        start_time = time.perf_counter()

        # Step 1: Generate query embedding locally on edge
        query_vector = self.embedding.embed_text(req.query)

        # Step 2: Build filters
        vector_filters: dict[str, Any] = {}
        if req.filters:
            if req.filters.category:
                vector_filters["category"] = [c.value for c in req.filters.category]
            if req.filters.status:
                vector_filters["status"] = [s.value for s in req.filters.status]
            else:
                # Default: active memories only
                vector_filters["status"] = MemoryStatus.ACTIVE.value

        # Step 3: Query local Qdrant Edge vector store
        raw_matches = self.vector_store.search(
            query_vector=query_vector,
            limit=req.limit,
            score_threshold=req.threshold,
            filters=vector_filters if vector_filters else None
        )

        # Step 4: Enrich results with verified metadata from SQLite
        results: list[SearchResultItem] = []
        for match in raw_matches:
            memory_id = match["id"]
            mem = self.db.get_memory(memory_id)
            if not mem:
                continue

            # Ensure not deleted
            if mem["status"] == MemoryStatus.DELETED.value:
                continue

            # Secondary filter check for date/tags if specified
            if req.filters:
                if req.filters.tags:
                    mem_tags = set(mem.get("tags", []))
                    if not any(t.lower() in mem_tags for t in req.filters.tags):
                        continue
                if req.filters.from_date and mem["created_at"] < req.filters.from_date:
                    continue
                if req.filters.to_date and mem["created_at"] > req.filters.to_date:
                    continue

            results.append(SearchResultItem(
                memory_id=mem["id"],
                text=mem["text"],
                score=round(match["score"], 4),
                category=MemoryCategory(mem["category"]),
                privacy=PrivacyLevel(mem["privacy"]),
                created_at=mem["created_at"],
                updated_at=mem["updated_at"],
                tags=mem["tags"],
                status=MemoryStatus(mem["status"])
            ))

        duration_ms = (time.perf_counter() - start_time) * 1000

        # Step 5: Privacy-safe activity logging (sanitize query text)
        is_offline = self.db.get_setting("offline_simulation", "false").lower() == "true" or settings.OFFLINE_SIMULATION

        self.db.record_activity(
            event_type=ActivityEventType.SEARCH_COMPLETED.value,
            actor_device_id=device,
            details={
                "results_count": len(results),
                "latency_ms": round(duration_ms, 2),
                "threshold": req.threshold,
                "offline": is_offline
            }
        )

        return SearchResponse(
            offline=is_offline,
            query=req.query,
            total_results=len(results),
            results=results,
            latency_ms=round(duration_ms, 2)
        )

    def keyword_search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        memories, _ = self.db.list_memories(
            search_query=query,
            status=MemoryStatus.ACTIVE.value,
            limit=limit
        )
        return memories
