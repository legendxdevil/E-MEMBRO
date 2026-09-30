import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = ROOT_DIR / "data"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "E-MEMBRO"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Current Device Info
    DEVICE_ID: str = "00000000-0000-0000-0000-000000000001"
    DEVICE_NAME: str = "Edge Node Alpha (Device A)"
    DEVICE_TYPE: str = "edge_device"
    APP_VERSION: str = "1.0.0"

    # Storage Paths
    SQLITE_DB_PATH: str = str(DATA_DIR / "edge_memory.db")
    EDGE_QDRANT_PATH: str = str(DATA_DIR / "qdrant_edge")
    CLOUD_QDRANT_PATH: str = str(DATA_DIR / "qdrant_cloud")
    CLOUD_QDRANT_URL: str = "http://localhost:6333"
    USE_LOCAL_CLOUD_QDRANT: bool = True

    # Vector & Embeddings
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    VECTOR_DIMENSION: int = 384
    LOCAL_COLLECTION_NAME: str = "edge_memories"
    CLOUD_COLLECTION_NAME: str = "cloud_memories"

    # Selective Sync & Connectivity
    SYNC_ENABLED: bool = True
    OFFLINE_SIMULATION: bool = False
    SYNC_INTERVAL_SECONDS: int = 10
    SYNC_BATCH_SIZE: int = 20
    MAX_SYNC_ATTEMPTS: int = 5
    CIRCUIT_BREAKER_FAIL_THRESHOLD: int = 3
    CIRCUIT_BREAKER_COOLDOWN_SECONDS: int = 30

    # Rate Limiting (per minute)
    RATE_LIMIT_READ: int = 60
    RATE_LIMIT_WRITE: int = 30
    RATE_LIMIT_SYNC: int = 10

    # Security
    API_SECRET_KEY: str = "dev-secret-key-32-bytes-minimum-security!!"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

settings = Settings()

# Ensure data directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(settings.EDGE_QDRANT_PATH, exist_ok=True)
os.makedirs(settings.CLOUD_QDRANT_PATH, exist_ok=True)
