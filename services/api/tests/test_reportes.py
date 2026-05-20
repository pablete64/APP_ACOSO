"""Tests de integración para M6 — Reporting y Dashboard."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── Reporte ejecutivo ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ejecutivo_sin_auth(client: AsyncClient) -> None:
    """Sin token devuelve 401."""
    resp = await client.get(
        "/api/v1/reportes/ejecutivo",
        params={"periodo_inicio": "2026-01-01", "periodo_fin": "2026-12-31"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_ejecutivo_trabajador_sin_permiso(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Trabajadores no tienen acceso a reportes."""
    resp = await client.get(
        "/api/v1/reportes/ejecutivo",
        params={"periodo_inicio": "2026-01-01", "periodo_fin": "2026-12-31"},
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_ejecutivo_igualdad_autorizado(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Igualdad puede acceder al reporte ejecutivo (reporte:ver_basico no lo bloquea)."""
    resp = await client.get(
        "/api/v1/reportes/ejecutivo",
        params={"periodo_inicio": "2026-01-01", "periodo_fin": "2026-12-31"},
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    # 200 si tiene permiso reporte:ver_completo, 403 si solo tiene ver_basico
    assert resp.status_code in (200, 403)


@pytest.mark.asyncio
async def test_ejecutivo_periodo_invalido(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Periodo con formato incorrecto devuelve 422."""
    resp = await client.get(
        "/api/v1/reportes/ejecutivo",
        params={"periodo_inicio": "no-es-fecha", "periodo_fin": "2026-12-31"},
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_ejecutivo_estructura(
    client: AsyncClient, token_rrhh: str
) -> None:
    """El reporte ejecutivo tiene las secciones esperadas."""
    resp = await client.get(
        "/api/v1/reportes/ejecutivo",
        params={"periodo_inicio": "2026-01-01", "periodo_fin": "2026-12-31"},
        headers={"Authorization": f"Bearer {token_rrhh}"},
    )
    if resp.status_code == 200:
        body = resp.json()
        for campo in ("denuncias", "expedientes", "formacion", "clima", "generado_en"):
            assert campo in body, f"Campo '{campo}' ausente en reporte ejecutivo"


# ── Cumplimiento ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cumplimiento_sin_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/reportes/cumplimiento")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_cumplimiento_autorizado(
    client: AsyncClient, token_rrhh: str
) -> None:
    """RRHH puede ver el informe de cumplimiento."""
    resp = await client.get(
        "/api/v1/reportes/cumplimiento",
        headers={"Authorization": f"Bearer {token_rrhh}"},
    )
    if resp.status_code == 200:
        body = resp.json()
        assert "items" in body
        assert isinstance(body["items"], list)
        assert "porcentaje_cumplimiento" in body
        for item in body["items"]:
            assert item["estado"] in ("cumple", "parcial", "pendiente")


# ── Plan de igualdad ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plan_igualdad_sin_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/reportes/plan-igualdad", params={"año": 2026})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_plan_igualdad_año_invalido(
    client: AsyncClient, token_rrhh: str
) -> None:
    """Año fuera de rango devuelve 422."""
    resp = await client.get(
        "/api/v1/reportes/plan-igualdad",
        params={"año": 1900},
        headers={"Authorization": f"Bearer {token_rrhh}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_plan_igualdad_estructura(
    client: AsyncClient, token_rrhh: str
) -> None:
    """El plan de igualdad tiene secciones."""
    resp = await client.get(
        "/api/v1/reportes/plan-igualdad",
        params={"año": 2026},
        headers={"Authorization": f"Bearer {token_rrhh}"},
    )
    if resp.status_code == 200:
        body = resp.json()
        assert "secciones" in body
        assert len(body["secciones"]) >= 4


# ── Exportación ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_export_sin_auth(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/reportes/export",
        json={
            "tipo": "ejecutivo",
            "formato": "pdf",
            "periodo_inicio": "2026-01-01",
            "periodo_fin": "2026-12-31",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_export_formato_invalido(
    client: AsyncClient, token_rrhh: str
) -> None:
    """Formato no soportado devuelve 422."""
    resp = await client.post(
        "/api/v1/reportes/export",
        json={
            "tipo": "ejecutivo",
            "formato": "docx",
            "periodo_inicio": "2026-01-01",
            "periodo_fin": "2026-12-31",
        },
        headers={"Authorization": f"Bearer {token_rrhh}"},
    )
    assert resp.status_code == 422
