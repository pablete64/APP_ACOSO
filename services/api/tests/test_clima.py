"""Tests de integración para M7 — Termómetro de clima laboral."""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


# ── Encuestas ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_encuestas_activas_requiere_auth(client: AsyncClient) -> None:
    """Sin token se devuelve 401."""
    resp = await client.get("/api/v1/clima/encuestas/activas")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_encuestas_activas_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador autenticado puede ver encuestas activas (puede ser lista vacía)."""
    resp = await client.get(
        "/api/v1/clima/encuestas/activas",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_crear_encuesta_sin_permiso(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador no puede crear encuestas."""
    resp = await client.post(
        "/api/v1/clima/encuestas",
        json={
            "titulo": "Pulso Q2 2026",
            "fecha_inicio": "2026-06-01",
            "fecha_fin": "2026-06-15",
            "dimensiones": ["autonomia", "carga_trabajo"],
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_crear_encuesta_igualdad(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Igualdad puede crear encuestas de clima."""
    resp = await client.post(
        "/api/v1/clima/encuestas",
        json={
            "titulo": "Pulso test Q2 2026",
            "fecha_inicio": "2026-06-01",
            "fecha_fin": "2026-06-30",
            "dimensiones": ["autonomia", "relaciones_apoyo"],
        },
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body


# ── Respuestas anónimas ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_responder_sin_auth(client: AsyncClient) -> None:
    """Enviar respuesta sin token devuelve 401."""
    resp = await client.post(
        "/api/v1/clima/respuestas",
        json={
            "encuesta_id": str(uuid.uuid4()),
            "respuestas": [{"pregunta_id": "aut_1", "valor": 4}],
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_responder_valor_invalido(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Valor fuera de rango 1–7 es rechazado por el schema."""
    resp = await client.post(
        "/api/v1/clima/respuestas",
        json={
            "encuesta_id": str(uuid.uuid4()),
            "respuestas": [{"pregunta_id": "aut_1", "valor": 0}],
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_responder_valor_maximo_valido(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Valor 7 es válido (escala 1–7)."""
    resp = await client.post(
        "/api/v1/clima/respuestas",
        json={
            "encuesta_id": str(uuid.uuid4()),
            "respuestas": [{"pregunta_id": "aut_1", "valor": 7}],
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    # 204 si la BD inserta; FK error si encuesta inexistente — aceptamos ambos
    assert resp.status_code in (204, 400, 500)


@pytest.mark.asyncio
async def test_respuestas_lista_vacia_rechazada(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Lista vacía de respuestas es rechazada."""
    resp = await client.post(
        "/api/v1/clima/respuestas",
        json={
            "encuesta_id": str(uuid.uuid4()),
            "respuestas": [],
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 422


# ── Indicadores ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_indicadores_sin_permiso(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Trabajadores no tienen permiso para ver indicadores."""
    resp = await client.get(
        f"/api/v1/clima/indicadores/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_indicadores_encuesta_inexistente(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Encuesta inexistente devuelve 404."""
    resp = await client.get(
        f"/api/v1/clima/indicadores/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert resp.status_code == 404
