"""Cliente HTTP del servicio Python → Java case-management.

El API Python actúa como BFF: recibe la petición del frontend, valida permisos
con su propio JWT, y reenvía al case-management con el mismo token de usuario
(o con un token servicio-a-servicio en producción).
"""
from __future__ import annotations

import os
from typing import Any

import httpx

_CASE_MANAGEMENT_URL = os.getenv("CASE_MANAGEMENT_URL", "http://localhost:8080")
_TIMEOUT = httpx.Timeout(10.0)


class ExpedienteClient:
    """Thin wrapper sobre httpx para las llamadas al servicio Java."""

    def __init__(self, access_token: str) -> None:
        self._headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def crear_expediente(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes",
                json=payload,
                headers=self._headers,
            )
            r.raise_for_status()
            return r.json()

    async def listar_expedientes(self, empresa_id: str, **params) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes",
                params={"empresaId": empresa_id, **params},
                headers=self._headers,
            )
            r.raise_for_status()
            return r.json()

    async def detalle_expediente(self, expediente_id: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes/{expediente_id}",
                headers=self._headers,
            )
            r.raise_for_status()
            return r.json()

    async def cambiar_estado(self, expediente_id: str, estado: str) -> None:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.patch(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes/{expediente_id}/estado",
                json={"estado": estado},
                headers=self._headers,
            )
            r.raise_for_status()

    async def registrar_evento(self, expediente_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes/{expediente_id}/eventos",
                json=payload,
                headers=self._headers,
            )
            r.raise_for_status()
            return r.json()

    async def firmar(self, expediente_id: str, payload: dict[str, Any]) -> None:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes/{expediente_id}/firmar",
                json=payload,
                headers=self._headers,
            )
            r.raise_for_status()

    async def exportar(self, expediente_id: str) -> bytes:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes/{expediente_id}/exportar",
                headers=self._headers,
            )
            r.raise_for_status()
            return r.content

    async def plazos(self, expediente_id: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{_CASE_MANAGEMENT_URL}/api/v1/expedientes/{expediente_id}/plazos",
                headers=self._headers,
            )
            r.raise_for_status()
            return r.json()
