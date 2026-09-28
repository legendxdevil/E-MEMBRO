import time
from collections import defaultdict
from typing import Optional
from fastapi import Request
from app.config import settings
from app.core.errors import RateLimitError

class RateLimiter:
    def __init__(self):
        # Maps bucket_key -> list of timestamp floats
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.window_seconds = 60

    def check_rate_limit(self, request: Request, endpoint_type: str = "read") -> None:
        """
        Enforces rate limiting based on client IP and/or device ID.
        Endpoint types: 'read' (60/min), 'write' (30/min), 'sync' (10/min)
        """
        client_ip = request.client.host if request.client else "127.0.0.1"
        device_id = request.headers.get("x-device-id", "")
        identifier = f"{client_ip}:{device_id}:{endpoint_type}"

        if endpoint_type == "sync":
            limit = settings.RATE_LIMIT_SYNC
        elif endpoint_type == "write":
            limit = settings.RATE_LIMIT_WRITE
        else:
            limit = settings.RATE_LIMIT_READ

        now = time.time()
        window_start = now - self.window_seconds

        # Prune old timestamps
        timestamps = [t for t in self.requests[identifier] if t > window_start]
        self.requests[identifier] = timestamps

        if len(timestamps) >= limit:
            retry_after = int(self.window_seconds - (now - timestamps[0])) + 1
            raise RateLimitError(
                code="RATE_LIMIT_EXCEEDED",
                message=f"Rate limit exceeded for {endpoint_type} operations. Max {limit} requests per minute.",
                retry_after=max(1, retry_after)
            )

        self.requests[identifier].append(now)

    def reset(self) -> None:
        self.requests.clear()

rate_limiter = RateLimiter()
