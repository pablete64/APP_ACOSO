"""Lógica de negocio del asistente IA — M2."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import AsyncIterator

import anthropic
from redis.asyncio import Redis

from app.chatbot.prompts import (
    CRISIS_KEYWORDS,
    EMERGENCY_RESPONSE,
    PII_PATTERNS,
    SYSTEM_PROMPT,
    WELCOME_MESSAGE,
)
from app.chatbot.schemas import (
    CrearSesionResponse,
    EvaluacionResponse,
    HistorialResponse,
    MensajeResponse,
)
from app.core.config import settings

_KEY_SESSION = "chat:session:{session_id}"
_KEY_MSGS    = "chat:msgs:{session_id}"
_KEY_RATE    = "chat:rate:{user_id}"


class ChatService:
    def __init__(self, redis: Redis) -> None:
        self._redis  = redis
        self._client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    # ── Crear sesión ──────────────────────────────────────────────────────────

    async def crear_sesion(self, user_id: str, modo: str) -> CrearSesionResponse:
        session_id = uuid.uuid4()
        ttl = settings.CHAT_RETENTION_DAYS * 86400

        meta = {
            "session_id": str(session_id),
            "user_id":    user_id,
            "modo":       modo,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        key = _KEY_SESSION.format(session_id=session_id)
        await self._redis.setex(key, ttl, json.dumps(meta))

        # Guardar mensaje de bienvenida del asistente
        await self._append_message(session_id, "assistant", WELCOME_MESSAGE)

        return CrearSesionResponse(
            session_id=session_id,
            modo=modo,
            mensaje_bienvenida=WELCOME_MESSAGE,
            expira_en=ttl,
        )

    # ── Enviar mensaje (sin streaming) ────────────────────────────────────────

    async def enviar_mensaje(
        self, session_id: uuid.UUID, user_id: str, contenido: str
    ) -> MensajeResponse:
        await self._check_rate_limit(user_id)
        await self._check_session_owner(session_id, user_id)

        # Detección de crisis — respuesta segura inmediata
        crisis = _detect_crisis(contenido)
        pii    = _detect_pii(contenido)

        # Guardar mensaje del usuario
        await self._append_message(session_id, "user", contenido)

        if crisis:
            await self._append_message(session_id, "assistant", EMERGENCY_RESPONSE)
            return MensajeResponse(
                role="assistant",
                contenido=EMERGENCY_RESPONSE,
                created_at=datetime.now(timezone.utc),
                crisis_detectada=True,
                pii_detectado=pii,
            )

        # Obtener historial para contexto
        historial = await self._get_messages_for_api(session_id)
        modo = await self._get_modo(session_id)

        system = SYSTEM_PROMPT
        if modo == "evaluacion":
            system += "\n\nModo activo: EVALUACIÓN. El usuario solicita un análisis estructurado."

        response = await self._client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1024,
            system=system,
            messages=historial,
        )
        respuesta = response.content[0].text

        await self._append_message(session_id, "assistant", respuesta)

        return MensajeResponse(
            role="assistant",
            contenido=respuesta,
            created_at=datetime.now(timezone.utc),
            crisis_detectada=False,
            pii_detectado=pii,
        )

    # ── Streaming SSE ─────────────────────────────────────────────────────────

    async def stream_mensaje(
        self, session_id: uuid.UUID, user_id: str, contenido: str
    ) -> AsyncIterator[str]:
        await self._check_rate_limit(user_id)
        await self._check_session_owner(session_id, user_id)

        crisis = _detect_crisis(contenido)
        pii    = _detect_pii(contenido)

        await self._append_message(session_id, "user", contenido)

        if crisis:
            await self._append_message(session_id, "assistant", EMERGENCY_RESPONSE)
            yield f"data: {json.dumps({'text': EMERGENCY_RESPONSE, 'crisis': True, 'done': True})}\n\n"
            return

        if pii:
            aviso = (
                f"⚠️ He detectado lo que podría ser {', '.join(pii)} en tu mensaje. "
                "Te recomiendo no incluir datos personales identificativos en el chat. "
                "Puedo ayudarte igualmente sin esos detalles.\n\n"
            )
            yield f"data: {json.dumps({'text': aviso, 'pii': pii, 'done': False})}\n\n"

        historial = await self._get_messages_for_api(session_id)
        modo = await self._get_modo(session_id)
        system = SYSTEM_PROMPT
        if modo == "evaluacion":
            system += "\n\nModo activo: EVALUACIÓN. Estructura tu respuesta según el formato de evaluación."

        full_response = []
        async with self._client.messages.stream(
            model=settings.AI_MODEL,
            max_tokens=1024,
            system=system,
            messages=historial,
        ) as stream:
            async for text in stream.text_stream:
                full_response.append(text)
                yield f"data: {json.dumps({'text': text, 'done': False})}\n\n"

        complete = "".join(full_response)
        await self._append_message(session_id, "assistant", complete)
        yield f"data: {json.dumps({'text': '', 'done': True})}\n\n"

    # ── Historial ─────────────────────────────────────────────────────────────

    async def historial(self, session_id: uuid.UUID, user_id: str) -> HistorialResponse:
        await self._check_session_owner(session_id, user_id)
        meta = await self._get_meta(session_id)
        raw_msgs = await self._get_raw_messages(session_id)

        mensajes = [
            MensajeResponse(
                role=m["role"],
                contenido=m["contenido"],
                created_at=datetime.fromisoformat(m["created_at"]),
            )
            for m in raw_msgs
        ]

        created_at = datetime.fromisoformat(meta["created_at"])
        expira_en  = created_at + timedelta(days=settings.CHAT_RETENTION_DAYS)

        return HistorialResponse(
            session_id=session_id,
            modo=meta["modo"],
            mensajes=mensajes,
            created_at=created_at,
            expira_en=expira_en,
        )

    # ── Evaluación estructurada ───────────────────────────────────────────────

    async def evaluacion(self, session_id: uuid.UUID, user_id: str) -> EvaluacionResponse:
        await self._check_session_owner(session_id, user_id)
        historial = await self._get_messages_for_api(session_id)

        eval_prompt = (
            "Basándote en nuestra conversación hasta ahora, genera una evaluación estructurada "
            "en JSON con exactamente estos campos: "
            "gravedad (baja|media|alta), justificacion_gravedad (string), "
            "reiteracion (episodio_unico|patron_repetido|no_determinado), "
            "relacion_poder (jerarquia|companeros|ambos|no_determinado), "
            "impacto_declarado (lista de strings), "
            "opciones_disponibles (lista de strings ordenadas de menor a mayor implicación formal), "
            "proximo_paso (string — una sola acción concreta), "
            "derivar_urgente (boolean). "
            "Responde SOLO con el JSON, sin texto adicional."
        )

        msgs = historial + [{"role": "user", "content": eval_prompt}]

        response = await self._client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=800,
            system=SYSTEM_PROMPT + "\n\nEstás generando una evaluación estructurada en JSON.",
            messages=msgs,
        )

        raw = response.content[0].text.strip()
        # Extraer JSON aunque venga envuelto en markdown
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group() if match else raw)

        return EvaluacionResponse(**data)

    # ── Borrar sesión ─────────────────────────────────────────────────────────

    async def borrar_sesion(self, session_id: uuid.UUID, user_id: str) -> None:
        await self._check_session_owner(session_id, user_id)
        await self._redis.delete(
            _KEY_SESSION.format(session_id=session_id),
            _KEY_MSGS.format(session_id=session_id),
        )

    # ── Helpers privados ──────────────────────────────────────────────────────

    async def _append_message(self, session_id: uuid.UUID, role: str, contenido: str) -> None:
        key = _KEY_MSGS.format(session_id=session_id)
        msg = json.dumps({
            "role": role,
            "contenido": contenido,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        ttl = settings.CHAT_RETENTION_DAYS * 86400
        await self._redis.rpush(key, msg)
        await self._redis.expire(key, ttl)

    async def _get_raw_messages(self, session_id: uuid.UUID) -> list[dict]:
        key = _KEY_MSGS.format(session_id=session_id)
        raw = await self._redis.lrange(key, 0, -1)
        return [json.loads(m) for m in raw]

    async def _get_messages_for_api(self, session_id: uuid.UUID) -> list[dict]:
        msgs = await self._get_raw_messages(session_id)
        return [{"role": m["role"], "content": m["contenido"]} for m in msgs]

    async def _get_meta(self, session_id: uuid.UUID) -> dict:
        key = _KEY_SESSION.format(session_id=session_id)
        raw = await self._redis.get(key)
        if not raw:
            raise ValueError("Sesión no encontrada o expirada")
        return json.loads(raw)

    async def _get_modo(self, session_id: uuid.UUID) -> str:
        meta = await self._get_meta(session_id)
        return meta.get("modo", "orientacion")

    async def _check_session_owner(self, session_id: uuid.UUID, user_id: str) -> None:
        meta = await self._get_meta(session_id)
        if meta["user_id"] != user_id:
            raise PermissionError("Sesión no pertenece al usuario")

    async def _check_rate_limit(self, user_id: str) -> None:
        key = _KEY_RATE.format(user_id=user_id)
        count = await self._redis.incr(key)
        if count == 1:
            await self._redis.expire(key, 3600)
        if count > settings.CHAT_RATE_LIMIT:
            raise RuntimeError(f"Límite de {settings.CHAT_RATE_LIMIT} mensajes/hora alcanzado")


# ── Funciones de detección ────────────────────────────────────────────────────

def _detect_crisis(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in CRISIS_KEYWORDS)


def _detect_pii(text: str) -> list[str]:
    detected = []
    for pattern, label in PII_PATTERNS:
        if re.search(pattern, text):
            detected.append(label)
    return detected
