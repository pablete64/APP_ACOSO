from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.analytics.router import router as analytics_router
from app.chatbot.router import router as chatbot_router
from app.core.redis import close_redis


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await close_redis()


app = FastAPI(
    title="SafeWork AI — Motor de IA",
    description="Servicio de IA: Asistente M2 y análisis de clima M7",
    version="0.2.0",
    lifespan=lifespan,
    # No exponer docs en producción
    docs_url="/docs" if True else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot_router, prefix="/chat", tags=["M2 - Asistente IA"])
app.include_router(analytics_router, prefix="/analytics", tags=["M7 - Análisis de clima"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "safework-ai-engine"}
