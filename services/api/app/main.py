from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.middleware import RequestIdMiddleware, SecurityHeadersMiddleware, TimingMiddleware
from app.api.v1.routes import api_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging(debug=settings.DEBUG)
    yield


app = FastAPI(
    title="SafeWork AI — API",
    description="API principal de la plataforma SafeWork AI",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Orden: los middleware se aplican en orden inverso al añadido
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "Server-Timing"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["infra"])
async def health_check():
    return {"status": "ok", "service": "safework-api", "version": "1.0.0"}


@app.get("/readiness", tags=["infra"])
async def readiness():
    """Readiness probe para Kubernetes / Docker Compose."""
    return {"ready": True}
