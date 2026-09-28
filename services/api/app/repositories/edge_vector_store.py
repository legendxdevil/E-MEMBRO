import os
from abc import ABC, abstractmethod
from typing import Optional, Any
from pathlib import Path
import qdrant_client
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
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
    Local Edge Vector Storage adapter using embedded Qdrant (disk-backed).
    Runs 100% locally on-device without needing internet connectivity or external server.
    """
    _clients: dict[str, qdrant_client.QdrantClient] = {}

    def __init__(self, storage_path: Optional[str] = None, collection_name: Optional[str] = None):
        self.storage_path = str(storage_path or settings.EDGE_QDRANT_PATH)
        self.collection_name = collection_name or settings.LOCAL_COLLECTION_NAME
        self.dimension = settings.VECTOR_DIMENSION

        Path(self.storage_path).mkdir(parents=True, exist_ok=True)
        if self.storage_path not in self._clients:
            self._clients[self.storage_path] = qdrant_client.QdrantClient(path=self.storage_path)
        self.client = self._clients[self.storage_path]
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        collections = self.client.get_collections().collections
        exists = any(c.name == self.collection_name for c in collections)
        if not exists:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE)
            )

    def upsert(self, point_id: str, vector: list[float], payload: dict[str, Any]) -> None:
        point = PointStruct(
            id=point_id,
            vector=vector,
            payload=payload
        )
        self.client.upsert(
            collection_name=self.collection_name,
            points=[point]
        )

    def delete(self, point_id: str) -> bool:
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[point_id]
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

        res = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=query_filter
        )

        results = []
        for p in res.points:
            results.append({
                "id": str(p.id),
                "score": float(p.score),
                "payload": p.payload or {}
            })
        return results

    def clear(self) -> None:
        try:
            self.client.delete_collection(collection_name=self.collection_name)
        except Exception:
            pass
        self._ensure_collection()
