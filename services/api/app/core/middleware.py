"""Middleware de seguridad y observabilidad para FastAPI."""
from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Añade cabeceras de seguridad en todas las respuestas de la API.
    El frontend Next.js y la landing Astro tienen sus propias cabeceras via Nginx.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]          = "DENY"
        response.headers["X-XSS-Protection"]         = "0"          # CSP hace el trabajo
        response.headers["Referrer-Policy"]           = "no-referrer"
        response.headers["Permissions-Policy"]        = (
            "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        )
        # HSTS — solo en prod (Nginx lo añade con preload en HTTPS)
        # response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

        return response


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Inyecta X-Request-ID para correlación de logs entre servicios."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """Añade Server-Timing para Lighthouse y debugging."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["Server-Timing"] = f"total;dur={elapsed_ms:.1f}"
        return response
