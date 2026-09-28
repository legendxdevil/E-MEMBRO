from typing import Optional, Any
from fastapi import HTTPException, status

class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

class NotFoundError(AppError):
    def __init__(self, code: str, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(code=code, message=message, status_code=status.HTTP_404_NOT_FOUND, details=details)

class ValidationError(AppError):
    def __init__(self, code: str, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(code=code, message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, details=details)

class ConflictError(AppError):
    def __init__(self, code: str, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(code=code, message=message, status_code=status.HTTP_409_CONFLICT, details=details)

class RateLimitError(AppError):
    def __init__(self, code: str = "RATE_LIMIT_EXCEEDED", message: str = "Too many requests. Please slow down.", retry_after: int = 60):
        super().__init__(
            code=code,
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"retry_after_seconds": retry_after}
        )
        self.retry_after = retry_after

class UnauthorizedError(AppError):
    def __init__(self, code: str = "UNAUTHORIZED", message: str = "Authentication credentials missing or invalid"):
        super().__init__(code=code, message=message, status_code=status.HTTP_401_UNAUTHORIZED)

class ForbiddenError(AppError):
    def __init__(self, code: str = "FORBIDDEN", message: str = "You do not have permission to access this resource"):
        super().__init__(code=code, message=message, status_code=status.HTTP_403_FORBIDDEN)

class ServiceUnavailableError(AppError):
    def __init__(self, code: str = "SERVICE_UNAVAILABLE", message: str = "Service is temporarily unavailable", retry_after: int = 30):
        super().__init__(
            code=code,
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"retry_after_seconds": retry_after}
        )
        self.retry_after = retry_after
