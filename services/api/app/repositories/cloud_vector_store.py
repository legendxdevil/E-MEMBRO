import os
from abc import ABC, abstractmethod
from typing import Optional, Any
from pathlib import Path
from qdrant_client import QdrantClient, models  # type: ignore

VectorParams = models.VectorParams
Distance = models.Distance
PointStruct = models.PointStruct
Filter = models.Filter
FieldCondition = models.FieldCondition
MatchValue = models.MatchValue
MatchAny = models.MatchAny

from app.config import settings

class CloudVectorStoreAdapter(ABC):
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
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def clear(self) -> None:
        pass


class QdrantCloudVectorStore(CloudVectorStoreAdapter):
    """
    Cloud Vector Storage adapter for Qdrant Cloud cluster (hosted on GCP).
    Initializes QdrantClient using settings.QDRANT_CLOUD_URL and settings.QDRANT_CLOUD_API_KEY.
    """
    _clients: dict[str, QdrantClient] = {}

    def __init__(self, cloud_url: Optional[str] = None, api_key: Optional[str] = None):
        self.cloud_url = cloud_url or settings.QDRANT_CLOUD_URL
        self.api_key = api_key or settings.QDRANT_CLOUD_API_KEY
        self.collection_name = settings.CLOUD_COLLECTION_NAME
        self.dimension = settings.VECTOR_DIMENSION
        self.client: Optional[QdrantClient] = None
        self._init_client()

    def _init_client(self) -> None:
        try:
            client_key = f"{self.cloud_url}:{self.api_key}"
            if client_key not in self._clients:
                if self.cloud_url == ":memory:":
                    self._clients[client_key] = QdrantClient(":memory:")
                else:
                    self._clients[client_key] = QdrantClient(
                        url=self.cloud_url,
                        api_key=self.api_key
                    )
            self.client = self._clients[client_key]
            self._ensure_collection()
        except Exception as e:
            print(f"[Qdrant Cloud] Initialization warning: {e}")

    def _ensure_collection(self) -> None:
        if not self.client:
            return
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE)
                )
        except Exception as e:
            print(f"Cloud vector collection init warning: {e}")

    def is_available(self) -> bool:
        if self.client is None:
            return False
        try:
            self.client.get_collections()
            return True
        except Exception:
            return False

    def upsert(self, point_id: str, vector: list[float], payload: dict[str, Any]) -> None:
        if not self.client:
            raise RuntimeError("Cloud vector store is unavailable")
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
        if not self.client:
            return False
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
        if not self.client:
            return []
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
        if self.client:
            try:
                self.client.delete_collection(collection_name=self.collection_name)
            except Exception:
                pass
            self._ensure_collection()

