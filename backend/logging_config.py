"""
Central logging setup + request-ID middleware.

Every request gets a short request_id; log lines carry it so pipeline
stages for one upload can be traced through the log output.
"""
import logging
import sys
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware

LOG_FORMAT = "%(asctime)s %(levelname)-7s %(name)s | %(message)s"


def setup_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt="%H:%M:%S"))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
    # Quieten noisy libraries
    for noisy in ("uvicorn.access", "httpx", "PIL", "pdfminer"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a request_id, log method/path/status/duration for every request."""

    async def dispatch(self, request, call_next):
        request_id = uuid.uuid4().hex[:8]
        request.state.request_id = request_id
        log = logging.getLogger("prism.request")
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed = (time.perf_counter() - start) * 1000
            log.exception(f"[{request_id}] {request.method} {request.url.path} failed after {elapsed:.0f}ms")
            raise
        elapsed = (time.perf_counter() - start) * 1000
        log.info(f"[{request_id}] {request.method} {request.url.path} -> {response.status_code} ({elapsed:.0f}ms)")
        response.headers["X-Request-ID"] = request_id
        return response
