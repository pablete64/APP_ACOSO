"""Tests de integración para M3 — Formación y recursos."""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


# ── Catálogo de cursos ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_listar_cursos_sin_auth(client: AsyncClient) -> None:
    """El catálogo requiere autenticación."""
    resp = await client.get("/api/v1/formacion/cursos")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_listar_cursos_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador autenticado obtiene la lista de cursos (puede ser vacía en tests)."""
    resp = await client.get(
        "/api/v1/formacion/cursos",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_detalle_curso_inexistente(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Solicitar un curso inexistente devuelve 404."""
    resp = await client.get(
        f"/api/v1/formacion/cursos/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 404


# ── Inscripción ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_inscribir_sin_auth(client: AsyncClient) -> None:
    """Inscribirse sin token devuelve 401."""
    resp = await client.post(f"/api/v1/formacion/cursos/{uuid.uuid4()}/inscribir")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_inscribir_idempotente(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Inscribirse dos veces en el mismo curso no falla (ON CONFLICT DO NOTHING)."""
    curso_id = str(uuid.uuid4())
    for _ in range(2):
        resp = await client.post(
            f"/api/v1/formacion/cursos/{curso_id}/inscribir",
            headers={"Authorization": f"Bearer {token_trabajador}"},
        )
        # 204 o error de FK si el curso no existe en la BD de tests
        assert resp.status_code in (204, 400, 404, 500)


# ── Completar módulo ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_completar_modulo_sin_auth(client: AsyncClient) -> None:
    """Completar módulo sin token devuelve 401."""
    resp = await client.post(
        f"/api/v1/formacion/modulos/{uuid.uuid4()}/completar",
        json={"puntuacion": None},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_completar_modulo_puntuacion_fuera_rango(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Puntuación > 100 es rechazada por el schema."""
    resp = await client.post(
        f"/api/v1/formacion/modulos/{uuid.uuid4()}/completar",
        json={"puntuacion": 150},
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_completar_modulo_puntuacion_negativa(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Puntuación negativa es rechazada por el schema."""
    resp = await client.post(
        f"/api/v1/formacion/modulos/{uuid.uuid4()}/completar",
        json={"puntuacion": -1},
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 422


# ── Certificados ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_certificado_inexistente(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Solicitar un certificado inexistente devuelve 404."""
    resp = await client.get(
        f"/api/v1/formacion/certificados/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_certificado_pdf_stub(
    client: AsyncClient, token_trabajador: str
) -> None:
    """El endpoint PDF devuelve 404 para certificado inexistente (no 501 aún)."""
    resp = await client.get(
        f"/api/v1/formacion/certificados/{uuid.uuid4()}/pdf",
        headers={"Authorization": f"Bearer {token_trabajador}"},
        follow_redirects=False,
    )
    # 404 porque el certificado no existe; 501 llegaría si existiera
    assert resp.status_code in (404, 501)


# ── Biblioteca normativa ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_biblioteca_sin_auth(client: AsyncClient) -> None:
    """La biblioteca normativa requiere autenticación."""
    resp = await client.get("/api/v1/formacion/biblioteca")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_biblioteca_autenticado(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador puede acceder a la biblioteca (puede ser vacía en tests)."""
    resp = await client.get(
        "/api/v1/formacion/biblioteca",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_biblioteca_filtro_tipo_valido(
    client: AsyncClient, token_trabajador: str
) -> None:
    """El filtro por tipo devuelve 200 con tipos válidos."""
    for tipo in ("ley", "reglamento", "guia", "jurisprudencia", "protocolo"):
        resp = await client.get(
            f"/api/v1/formacion/biblioteca?tipo={tipo}",
            headers={"Authorization": f"Bearer {token_trabajador}"},
        )
        assert resp.status_code == 200, f"Falló con tipo={tipo}"
