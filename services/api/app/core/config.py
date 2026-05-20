from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "SafeWork AI"
    DEBUG: bool = False
    API_VERSION: str = "v1"

    DATABASE_URL: str
    REDIS_URL: str

    # JWT — RS256 en prod, HS256 en dev (si no se proveen claves RSA)
    JWT_SECRET: str = ""                # Fallback HS256 para dev
    JWT_PRIVATE_KEY: str = ""          # PEM RSA privada (prod)
    JWT_PUBLIC_KEY: str = ""           # PEM RSA pública (prod)
    JWT_EXPIRES_IN: int = 900          # 15 minutos (access token)
    REFRESH_TOKEN_EXPIRES_IN: int = 2_592_000  # 30 días

    ENCRYPTION_MASTER_KEY: str

    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4321"]
    ALLOWED_HOSTS: List[str] = ["*"]

    AI_ENGINE_URL: str = "http://localhost:8001"
    CASE_MGMT_URL: str = "http://localhost:8080"

    SMTP_HOST: str = "mailhog"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "SafeWork AI <noreply@safework.es>"

    S3_ENDPOINT: str = ""
    S3_BUCKET: str = "safework-evidencias"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "eu-central-1"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
