"""Tests de integración para M1 — Canal seguro de denuncia."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

DENUNCIA_PAYLOAD = {
    "modalidad": "anonima",
    "tipo_acoso": "acoso_moral",
    "ciphertext_b64": "dGVzdGNpcGhlcnRleHRiYXNlNjRlbmNvZGVk",
    "iv_b64": "dGVzdGl2MTI=",
    "evidencias": [],
}


@pytest.mark.asyncio
async def test_crear_denuncia_anonima_sin_auth(client: AsyncClient) -> None:
    """Una denuncia anónima se puede crear sin token."""
    resp = await client.post("/api/v1/denuncias", json=DENUNCIA_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert "tracking_code" in body
    assert len(body["tracking_code"]) == 10


@pytest.mark.asyncio
async def test_tracking_code_formato(client: AsyncClient) -> None:
    """El tracking_code solo contiene caracteres del alfabeto sin ambiguos."""
    resp = await client.post("/api/v1/denuncias", json=DENUNCIA_PAYLOAD)
    assert resp.status_code == 201
    code = resp.json()["tracking_code"]
    valid_chars = set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
    assert all(c in valid_chars for c in code), f"Caracteres inválidos en: {code}"


@pytest.mark.asyncio
async def test_crear_denuncia_ciphertext_requerido(client: AsyncClient) -> None:
    """Sin ciphertext_b64 la validación debe fallar."""
    payload = {**DENUNCIA_PAYLOAD}
    payload.pop("ciphertext_b64")
    resp = await client.post("/api/v1/denuncias", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_seguimiento_not_found(client: AsyncClient) -> None:
    """Un tracking_code inexistente devuelve 404."""
    resp = await client.get("/api/v1/denuncias/seguimiento/AAAAAAAAAA")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_seguimiento_ok(client: AsyncClient) -> None:
    """Se crea una denuncia y se consulta su seguimiento."""
    create = await client.post("/api/v1/denuncias", json=DENUNCIA_PAYLOAD)
    assert create.status_code == 201
    tc = create.json()["tracking_code"]

    resp = await client.get(f"/api/v1/denuncias/seguimiento/{tc}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["tracking_code"] == tc
    assert body["estado"] == "recibida"
    assert body["modalidad"] == "anonima"


@pytest.mark.asyncio
async def test_seguimiento_tracking_code_case_insensitive(client: AsyncClient) -> None:
    """El seguimiento acepta tracking_code en minúsculas."""
    create = await client.post("/api/v1/denuncias", json=DENUNCIA_PAYLOAD)
    tc = create.json()["tracking_code"]
    resp = await client.get(f"/api/v1/denuncias/seguimiento/{tc.lower()}")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_mensaje_seguimiento_anonimo(client: AsyncClient) -> None:
    """Un denunciante anónimo puede añadir un mensaje al hilo."""
    create = await client.post("/api/v1/denuncias", json=DENUNCIA_PAYLOAD)
    tc = create.json()["tracking_code"]

    msg_payload = {
        "ciphertext_b64": "dGVzdG1lbnNhamVjaXBoZXI=",
        "iv_b64": "dGVzdGl2MjI=",
    }
    resp = await client.post(f"/api/v1/denuncias/seguimiento/{tc}/mensajes", json=msg_payload)
    assert resp.status_code == 201
    assert resp.json()["ok"] is True


@pytest.mark.asyncio
async def test_mensaje_seguimiento_denuncia_inexistente(client: AsyncClient) -> None:
    """Añadir mensaje a un tracking_code inexistente devuelve 404."""
    msg_payload = {
        "ciphertext_b64": "dGVzdG1lbnNhamVjaXBoZXI=",
        "iv_b64": "dGVzdGl2MjI=",
    }
    resp = await client.post("/api/v1/denuncias/seguimiento/ZZZZZZZZZZ/mensajes", json=msg_payload)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_listar_denuncias_sin_auth(client: AsyncClient) -> None:
    """Listar denuncias sin token devuelve 401."""
    resp = await client.get("/api/v1/denuncias")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_listar_denuncias_trabajador_forbidden(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador no tiene permiso denuncia:ver_todas."""
    resp = await client.get(
        "/api/v1/denuncias",
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_listar_denuncias_igualdad_ok(
    client: AsyncClient, token_igualdad: str
) -> None:
    """Responsable de Igualdad puede listar denuncias."""
    resp = await client.get(
        "/api/v1/denuncias",
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body


@pytest.mark.asyncio
async def test_detalle_denuncia_igualdad(
    client: AsyncClient, token_igualdad: str
) -> None:
    """El detalle incluye ciphertext y evidencias (vacías en este caso)."""
    create = await client.post("/api/v1/denuncias", json=DENUNCIA_PAYLOAD)
    tc = create.json()["tracking_code"]

    # Obtener id de la denuncia
    list_resp = await client.get(
        "/api/v1/denuncias",
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    items = list_resp.json()["items"]
    denuncia = next((i for i in items if i["tracking_code"] == tc), None)
    assert denuncia is not None, "Denuncia recién creada no aparece en el listado"

    detail_resp = await client.get(
        f"/api/v1/denuncias/{denuncia['id']}",
        headers={"Authorization": f"Bearer {token_igualdad}"},
    )
    assert detail_resp.status_code == 200
    body = detail_resp.json()
    assert "ciphertext_b64" in body
    assert "evidencias" in body
    assert "mensajes" in body


@pytest.mark.asyncio
async def test_asignar_instructor_sin_permiso(
    client: AsyncClient, token_trabajador: str
) -> None:
    """Un trabajador no puede asignar instructores."""
    import uuid
    fake_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/denuncias/{fake_id}/asignar",
        json={"instructor_id": str(uuid.uuid4())},
        headers={"Authorization": f"Bearer {token_trabajador}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_evidencias_max_10(client: AsyncClient) -> None:
    """Más de 10 evidencias causa error de validación 422."""
    ev = {
        "nombre_archivo": "doc.pdf",
        "tipo_mime": "application/pdf",
        "tamano_bytes": 1024,
        "sha256_original": "a" * 64,
        "storage_key": "org/uuid/doc.pdf.enc",
        "iv_b64": "dGVzdGl2MzM=",
    }
    payload = {**DENUNCIA_PAYLOAD, "evidencias": [ev] * 11}
    resp = await client.post("/api/v1/denuncias", json=payload)
    assert resp.status_code == 422
