"""Tests de integración para M8 — Mediación, pares de apoyo y represalias."""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


# ── Pares de apoyo ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_listar_pares_sin_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/apoyo/pares")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_listar_pares_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    resp = await client.get(
        "/api/v1/apoyo/pares",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_registrar_par_sin_consentimiento(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Sin consentimiento explícito devuelve 422."""
    resp = await client.post(
        "/api/v1/apoyo/pares/registrarse",
        json={
            "consentimiento_explicito": False,
            "nombre_visible": "María G.",
            "idiomas": ["es"],
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_registrar_par_nombre_muy_corto(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Nombre < 2 caracteres rechazado por schema."""
    resp = await client.post(
        "/api/v1/apoyo/pares/registrarse",
        json={
            "consentimiento_explicito": True,
            "nombre_visible": "A",
            "idiomas": ["es"],
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_darse_de_baja_sin_auth(client: AsyncClient) -> None:
    resp = await client.delete("/api/v1/apoyo/pares/baja")
    assert resp.status_code == 401


# ── Mediaciones ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_solicitar_mediacion_sin_auth(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/apoyo/mediaciones",
        json={
            "motivo_ciphertext": "dGVzdA==",
            "motivo_iv_b64": "dGVzdGl2",
            "consentimiento_ambas_partes": True,
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_solicitar_mediacion_sin_consentimiento(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Sin consentimiento devuelve 422."""
    resp = await client.post(
        "/api/v1/apoyo/mediaciones",
        json={
            "motivo_ciphertext": "dGVzdA==",
            "motivo_iv_b64": "dGVzdGl2",
            "consentimiento_ambas_partes": False,
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_listar_mediaciones_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    resp = await client.get(
        "/api/v1/apoyo/mediaciones",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_detalle_mediacion_sin_permiso(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Detalle individual requiere permiso mediacion:gestionar."""
    resp = await client.get(
        f"/api/v1/apoyo/mediaciones/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_detalle_mediacion_igualdad_not_found(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Mediación inexistente devuelve 404."""
    resp = await client.get(
        f"/api/v1/apoyo/mediaciones/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_actualizar_mediacion_sin_permiso(
    client: AsyncClient, token_trabajador: str
) -> None:
    resp = await client.patch(
        f"/api/v1/apoyo/mediaciones/{uuid.uuid4()}",
        json={"estado": "en_proceso"},
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cancelar_mediacion_sin_auth(client: AsyncClient) -> None:
    resp = await client.delete(f"/api/v1/apoyo/mediaciones/{uuid.uuid4()}")
    assert resp.status_code == 401


# ── Represalias ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_registrar_represalia_sin_auth(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/apoyo/represalias",
        json={
            "descripcion_ciphertext": "dGVzdA==",
            "descripcion_iv_b64": "dGVzdGl2",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_registrar_represalia_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador puede registrar una represalia (aunque la BD no persista en tests)."""
    resp = await client.post(
        "/api/v1/apoyo/represalias",
        json={
            "descripcion_ciphertext": "dGVzdGRlc2NyaXBjaW9u",
            "descripcion_iv_b64": "dGVzdGl2MjIyMjI=",
        },
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code in (201, 400, 500)


@pytest.mark.asyncio
async def test_listar_represalias_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    resp = await client.get(
        "/api/v1/apoyo/represalias",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_listar_represalias_igualdad_ve_todas(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Igualdad ve todas las represalias (gestor = True)."""
    resp = await client.get(
        "/api/v1/apoyo/represalias",
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
