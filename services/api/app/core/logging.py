"""Logging estructurado JSON con trace_id para correlación entre servicios."""
from __future__ import annotations

import logging
import sys
import time
from typing import Any

import json


class JsonFormatter(logging.Formatter):
    """Formatea logs como JSON para ingestión en Grafana/ELK/Loki."""

    SCRUB_KEYS = frozenset({
        "password", "token", "secret", "key", "authorization",
        "ciphertext", "iv_b64", "relato", "descripcion",
    })

    def format(self, record: logging.LogRecord) -> str:
        log: dict[str, Any] = {
            "ts":      time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level":   record.levelname,
            "logger":  record.name,
            "message": record.getMessage(),
            "service": "safework-api",
        }

        if record.exc_info:
            log["exc"] = self.formatException(record.exc_info)

        # Campos extra añadidos con logger.info("msg", extra={...})
        for key, val in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            ) and not key.startswith("_"):
                # Nunca loguear datos sensibles
                if key.lower() in self.SCRUB_KEYS:
                    log[key] = "[REDACTED]"
                else:
                    log[key] = val

        return json.dumps(log, default=str, ensure_ascii=False)


def configure_logging(debug: bool = False) -> None:
    level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    # Silenciar loggers ruidosos en prod
    if not debug:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
