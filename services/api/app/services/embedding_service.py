import math
import time
from typing import Optional
from fastembed import TextEmbedding
from app.config import settings

class EmbeddingService:
    _instance: Optional["EmbeddingService"] = None
    _model: Optional[TextEmbedding] = None

    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL
        self.dimension = settings.VECTOR_DIMENSION
        self.init_model()

    @classmethod
    def get_instance(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = EmbeddingService()
        return cls._instance

    def init_model(self) -> None:
        try:
            # FastEmbed downloads and caches to local huggingface cache directory
            self._model = TextEmbedding(model_name=self.model_name)
        except Exception as e:
            # Model init error handling
            print(f"Warning: Failed to initialize FastEmbed model '{self.model_name}': {e}")
            self._model = None

    def embed_text(self, text: str) -> list[float]:
        """
        Embeds a single string into a normalized dense vector of length 384.
        Validates output to ensure finite values and correct dimensions.
        """
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text")

        if self._model is None:
            self.init_model()
            if self._model is None:
                raise RuntimeError("Embedding model is unavailable")

        start = time.perf_counter()
        embeddings = list(self._model.embed([text]))
        duration_ms = (time.perf_counter() - start) * 1000

        if not embeddings:
            raise RuntimeError("Embedding model returned empty results")

        vector = [float(x) for x in embeddings[0]]

        # Validation: check dimension
        if len(vector) != self.dimension:
            raise ValueError(f"Vector dimension mismatch: expected {self.dimension}, got {len(vector)}")

        # Validation: check for NaN or Infinity
        for val in vector:
            if math.isnan(val) or math.isinf(val):
                raise ValueError("Embedding contains non-finite values (NaN or Infinity)")

        return vector

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if self._model is None:
            self.init_model()
            if self._model is None:
                raise RuntimeError("Embedding model is unavailable")

        embeddings = list(self._model.embed(texts))
        results = []
        for emb in embeddings:
            vector = [float(x) for x in emb]
            if len(vector) != self.dimension:
                raise ValueError(f"Vector dimension mismatch: expected {self.dimension}, got {len(vector)}")
            for val in vector:
                if math.isnan(val) or math.isinf(val):
                    raise ValueError("Embedding contains non-finite values (NaN or Infinity)")
            results.append(vector)
        return results
