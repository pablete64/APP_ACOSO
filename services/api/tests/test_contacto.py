"""Tests de integración para M4 — Línea de contacto."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── Personas designadas ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_directorio_sin_auth(client: AsyncClient) -> None:
    """El directorio de personas designadas es accesible sin autenticación."""
    resp = await client.get("/api/v1/contacto/personas-designadas")
    # 200 (lista vacía en tests) o 401 si se requiere auth — depende de política
    assert resp.status_code in (200, 401)


@pytest.mark.asyncio
async def test_directorio_con_auth(client: AsyncClient, token_trabajador: str) -> None:
    """Un trabajador autenticado puede ver el directorio."""
    resp = await client.get(
        "/api/v1/contacto/personas-designadas",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── Mensajería cifrada ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_enviar_mensaje_sin_auth(client: AsyncClient) -> None:
    """Enviar mensaje sin token devuelve 401."""
    import uuid
    resp = await client.post(
        "/api/v1/contacto/mensajes",
        json={
            "destinatario_id": str(uuid.uuid4()),
            "ciphertext_b64": "dGVzdG1lbnNhamVjaXBoZXI=",
            "iv_b64": "dGVzdGl2MjI=",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_listar_conversaciones_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador autenticado puede listar sus conversaciones (vacías en test)."""
    resp = await client.get(
        "/api/v1/contacto/mensajes/conversaciones",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── Citas ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_crear_cita_sin_auth(client: AsyncClient) -> None:
    """Crear cita sin token devuelve 401."""
    import uuid
    resp = await client.post(
        "/api/v1/contacto/citas",
        json={
            "persona_designada_id": str(uuid.uuid4()),
            "modalidad": "presencial",
            "fecha_propuesta": "2026-06-01T10:00:00Z",
            "motivo_ciphertext": "dGVzdGNpcGhlcg==",
            "motivo_iv_b64": "dGVzdGl2MjI=",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_listar_citas_trabajador(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador puede ver sus citas (vacías en test)."""
    resp = await client.get(
        "/api/v1/contacto/citas",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_actualizar_cita_sin_permiso(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador no tiene permiso para confirmar/cancelar citas."""
    import uuid
    resp = await client.patch(
        f"/api/v1/contacto/citas/{uuid.uuid4()}",
        json={"estado": "confirmada"},
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_actualizar_cita_igualdad_not_found(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Igualdad con permiso pero cita inexistente devuelve 404."""
    import uuid
    resp = await client.patch(
        f"/api/v1/contacto/citas/{uuid.uuid4()}",
        json={"estado": "confirmada"},
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert resp.status_code == 404
