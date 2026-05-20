"""Configuración del motor de IA."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL: str = "claude-sonnet-4-6"

    # Redis — sesiones de chat y rate limiting
    REDIS_URL: str = "redis://localhost:6379/1"

    # JWT — mismo secret que el servicio api para validar tokens de usuario
    JWT_SECRET: str = "dev-secret-change-in-production"

    # Retención de conversaciones (días)
    CHAT_RETENTION_DAYS: int = 30

    # Rate limiting: mensajes por usuario por hora
    CHAT_RATE_LIMIT: int = 60

    # URL del servicio api (para derivar denuncia)
    API_SERVICE_URL: str = "http://localhost:8000"


settings = Settings()
