import os
import shutil
from abc import ABC, abstractmethod
from typing import Optional, Any
from pathlib import Path
from qdrant_edge import (
    EdgeShard,
    EdgeConfig,
    EdgeVectorParams,
    Distance,
    Point,
    UpdateOperation,
    QueryRequest,
    Query,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
)
from app.config import settings

class EdgeVectorStoreAdapter(ABC):
    @abstractmethod
    def upsert(self, point_id: str, vector: list[float], payload: dict[str, Any]) -> None:
        pass

    @abstractmethod
    def delete(self, point_id: str) -> bool:
        pass

    @abstractmethod
    def search(
        self,
        query_vector: list[float],
        limit: int = 10,
        score_threshold: float = 0.35,
        filters: Optional[dict[str, Any]] = None
    ) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    def clear(self) -> None:
        pass


class QdrantEdgeVectorStore(EdgeVectorStoreAdapter):
    """
    Local Edge Vector Storage adapter using official Qdrant Edge (qdrant-edge-py).
    Runs 100% locally in-process on-device using EdgeShard without external server.
    """
    _shards: dict[str, EdgeShard] = {}

    def __init__(self, storage_path: Optional[str] = None, collection_name: Optional[str] = None):
        base_path = Path(storage_path or settings.EDGE_QDRANT_PATH)
        if collection_name:
            self.storage_path = str(base_path / collection_name)
        else:
            self.storage_path = str(base_path)
        self.dimension = settings.VECTOR_DIMENSION

        Path(self.storage_path).mkdir(parents=True, exist_ok=True)
        if self.storage_path not in self._shards:
            self._shards[self.storage_path] = self._get_or_create_shard()
        self.shard = self._shards[self.storage_path]

    def _get_or_create_shard(self) -> EdgeShard:
        p = Path(self.storage_path)
        p.mkdir(parents=True, exist_ok=True)
        config = EdgeConfig(
            vectors={"": EdgeVectorParams(size=self.dimension, distance=Distance.Cosine)}
        )
        if any(p.iterdir()):
            try:
                return EdgeShard.load(self.storage_path)
            except Exception:
                for item in p.iterdir():
                    if item.is_dir():
                        shutil.rmtree(item, ignore_errors=True)
                    else:
                        try:
                            item.unlink(missing_ok=True)
                        except Exception:
                            pass
                return EdgeShard.create(self.storage_path, config)
        return EdgeShard.create(self.storage_path, config)

    def upsert(self, point_id: str, vector: list[float], payload: dict[str, Any]) -> None:
        point = Point(
            id=point_id,
            vector=vector,
            payload=payload
        )
        self.shard.update(
            UpdateOperation.upsert_points([point])
        )

    def delete(self, point_id: str) -> bool:
        try:
            self.shard.update(
                UpdateOperation.delete_points([point_id])
            )
            return True
        except Exception:
            return False

    def search(
        self,
        query_vector: list[float],
        limit: int = 10,
        score_threshold: float = 0.35,
        filters: Optional[dict[str, Any]] = None
    ) -> list[dict[str, Any]]:
        query_filter: Optional[Filter] = None
        if filters:
            must_conditions = []
            for key, val in filters.items():
                if val is None:
                    continue
                if isinstance(val, list):
                    if val:
                        must_conditions.append(FieldCondition(key=key, match=MatchAny(any=val)))
                else:
                    must_conditions.append(FieldCondition(key=key, match=MatchValue(value=val)))
            if must_conditions:
                query_filter = Filter(must=must_conditions)

        req = QueryRequest(
            limit=limit,
            query=Query.Nearest(query_vector),
            filter=query_filter,
            score_threshold=score_threshold,
            with_payload=True
        )

        scored_points = self.shard.query(req)
        results = []
        for p in scored_points:
            results.append({
                "id": str(p.id),
                "score": float(p.score),
                "payload": p.payload or {}
            })
        return results

    def clear(self) -> None:
        try:
            self.shard.close()
        except Exception:
            pass
        if os.path.exists(self.storage_path):
            shutil.rmtree(self.storage_path, ignore_errors=True)
        self.shard = self._get_or_create_shard()
        self._shards[self.storage_path] = self.shard

