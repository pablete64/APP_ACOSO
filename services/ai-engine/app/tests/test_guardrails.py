"""Tests de guardrails críticos — detección de crisis y PII.

Estos tests NO requieren API key de Anthropic ni Redis: validan
la lógica de detección que debe ejecutarse ANTES de llamar al modelo.
"""
from __future__ import annotations

import pytest

from app.chatbot.service import _detect_crisis, _detect_pii


# ── Detección de crisis ───────────────────────────────────────────────────────

@pytest.mark.parametrize("texto", [
    "me quiero suicidar",
    "no quiero vivir más",
    "voy a matarme",
    "me voy a hacer daño",
    "tengo ideación suicida",
    "me voy a quitar la vida",
])
def test_detecta_crisis_expresiones_directas(texto: str) -> None:
    assert _detect_crisis(texto) is True, f"No detectó crisis en: {texto!r}"


@pytest.mark.parametrize("texto", [
    "mi jefe me grita todos los días",
    "me siento muy mal en el trabajo",
    "no puedo dormir por el estrés",
    "tengo miedo de ir a la oficina",
    "quiero presentar una denuncia",
])
def test_no_falso_positivo_crisis(texto: str) -> None:
    assert _detect_crisis(texto) is False, f"Falso positivo en: {texto!r}"


def test_detecta_crisis_case_insensitive() -> None:
    assert _detect_crisis("Me voy a SUICIDARME") is True
    assert _detect_crisis("No Quiero Vivir") is True


# ── Detección de PII ──────────────────────────────────────────────────────────

@pytest.mark.parametrize("texto,etiqueta_esperada", [
    ("mi DNI es 12345678Z", "DNI/NIE"),
    ("llámame al 666123456", "número de teléfono"),
    ("escríbeme a juan@empresa.com", "dirección de email"),
])
def test_detecta_pii(texto: str, etiqueta_esperada: str) -> None:
    detectados = _detect_pii(texto)
    assert etiqueta_esperada in detectados, f"No detectó {etiqueta_esperada!r} en: {texto!r}"


def test_sin_pii_devuelve_lista_vacia() -> None:
    assert _detect_pii("me siento muy mal en el trabajo") == []


def test_pii_multiples() -> None:
    texto = "soy 12345678Z y mi email es yo@empresa.com"
    detectados = _detect_pii(texto)
    assert len(detectados) >= 2


# ── System prompt — reglas no negociables ────────────────────────────────────

def test_system_prompt_contiene_guardrails_criticos() -> None:
    from app.chatbot.prompts import SYSTEM_PROMPT
    assert "024" in SYSTEM_PROMPT, "Falta línea de crisis 024"
    assert "112" in SYSTEM_PROMPT, "Falta línea de emergencias 112"
    assert "016" in SYSTEM_PROMPT, "Falta línea de violencia de género 016"
    assert "No diagnosticas" in SYSTEM_PROMPT or "no diagnosticas" in SYSTEM_PROMPT.lower()
    assert "Ley 2/2023" in SYSTEM_PROMPT


def test_welcome_message_contiene_aviso_no_profesional() -> None:
    from app.chatbot.prompts import WELCOME_MESSAGE
    assert "No soy psicólogo" in WELCOME_MESSAGE or "no soy psicólogo" in WELCOME_MESSAGE.lower()


def test_emergency_response_contiene_todos_los_recursos() -> None:
    from app.chatbot.prompts import EMERGENCY_RESPONSE
    assert "024" in EMERGENCY_RESPONSE
    assert "112" in EMERGENCY_RESPONSE
    assert "016" in EMERGENCY_RESPONSE
