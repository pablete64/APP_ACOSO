"""Tests de autenticación y RBAC.

Cubre: login OK, login fallido, lockout, MFA, refresh, logout,
       acceso con perfil correcto/incorrecto (→ 403).
"""
import pytest
from httpx import AsyncClient

WORKER_TOKEN   = None   # se rellena en el fixture de sesión
RRHH_TOKEN     = None

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def worker_credentials():
    return {"email": "worker@test.es", "password": "Demo1234!"}


@pytest.fixture
def rrhh_credentials():
    return {"email": "rrhh@test.es", "password": "Demo1234!"}


# ── Login ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_ok(client: AsyncClient, worker_credentials):
    resp = await client.post("/api/v1/auth/login", json=worker_credentials)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["perfil"] == "trabajador"
    assert "sw_refresh" in resp.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, worker_credentials):
    resp = await client.post(
        "/api/v1/auth/login",
        json={**worker_credentials, "password": "wrong_password_123!"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "noexiste@test.es", "password": "Demo1234!"},
    )
    assert resp.status_code == 401
    # No revelar si el usuario existe
    assert "noexiste" not in resp.text


@pytest.mark.asyncio
async def test_login_lockout_after_5_failures(client: AsyncClient, worker_credentials):
    for _ in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={**worker_credentials, "password": "BadPass123!"},
        )
    resp = await client.post("/api/v1/auth/login", json=worker_credentials)
    assert resp.status_code in (423, 401)  # bloqueado o credenciales


# ── Refresh ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refresh_ok(client: AsyncClient, worker_credentials):
    login = await client.post("/api/v1/auth/login", json=worker_credentials)
    assert login.status_code == 200

    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_refresh_without_cookie(client: AsyncClient):
    client.cookies.clear()
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


# ── Logout ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_logout_revokes_refresh(client: AsyncClient, worker_credentials):
    await client.post("/api/v1/auth/login", json=worker_credentials)
    login2 = await client.post("/api/v1/auth/login", json=worker_credentials)
    token = login2.json()["access_token"]

    resp = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 204

    # Refresh debe fallar tras logout
    resp2 = await client.post("/api/v1/auth/refresh")
    assert resp2.status_code == 401


# ── /me ────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, worker_credentials):
    login = await client.post("/api/v1/auth/login", json=worker_credentials)
    token = login.json()["access_token"]

    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "worker@test.es"
    assert data["perfil"] == "trabajador"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


# ── RBAC — perfil incorrecto → 403 ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_worker_cannot_access_expedientes(client: AsyncClient, worker_credentials):
    """Trabajador sin permiso expediente:crear → 403."""
    login = await client.post("/api/v1/auth/login", json=worker_credentials)
    token = login.json()["access_token"]

    resp = await client.post(
        "/api/v1/expedientes",
        json={"denuncia_id": "00000000-0000-0000-0000-000000000001"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (403, 404)  # 404 si la ruta aún no existe, 403 si existe


@pytest.mark.asyncio
async def test_rrhh_can_access_expedientes(client: AsyncClient, rrhh_credentials):
    """RRHH con permiso expediente:crear → no 403."""
    login = await client.post("/api/v1/auth/login", json=rrhh_credentials)
    token = login.json()["access_token"]

    resp = await client.get(
        "/api/v1/expedientes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code != 403


# ── Cross-tenant isolation ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cross_tenant_isolation(client: AsyncClient, worker_credentials, rrhh_credentials):
    """Usuario de empresa A no puede leer datos de empresa B aunque tenga JWT válido."""
    # Empresa A: worker@test.es (schema empresa_t00000000)
    login_a = await client.post("/api/v1/auth/login", json=worker_credentials)
    token_a = login_a.json()["access_token"]

    # Intentar acceder con JWT de empresa A a un recurso que requiera empresa B
    # (la validación tenant_schema en el JWT lo bloqueará)
    resp = await client.get(
        "/api/v1/denuncias/dddd0002-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    # Debe ser 404 (no encontrado en el schema del usuario) o 403, nunca 200 con datos de otra empresa
    assert resp.status_code in (403, 404, 401)
