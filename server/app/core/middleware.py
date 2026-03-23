import uuid
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-Id"] = request_id
        client = request.client
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() if request.headers.get("x-forwarded-for") else (client.host if client else None)
        extra = {
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "ip": ip,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
        }
        logger.info("request", extra=extra)
        return response
