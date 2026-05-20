"""Stub del módulo analytics — M7 Termómetro de clima.
Implementación completa en F10.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def analytics_health() -> dict:
    return {"status": "ok", "module": "M7-analytics", "note": "stub — F10"}
