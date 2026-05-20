# Flujo end-to-end de una denuncia cifrada

## Diagrama de secuencia

```mermaid
sequenceDiagram
  actor W as Trabajador/a
  participant Browser as Browser (Web Crypto API)
  participant Next as apps/web (Next.js)
  participant API as services/api (FastAPI)
  participant PG as PostgreSQL

  Note over W,PG: FASE 1 — Inicio de sesión (denuncia identificada) o sin auth (anónima)

  W->>Browser: Introduce contraseña (solo denuncia identificada)
  Browser->>Browser: PBKDF2(password, salt, 600k iter) → sessionKey
  Browser->>API: POST /auth/login { email, passwordHash }
  API-->>Browser: { jwt, saltB64, wrappedContentKeyB64 }
  Browser->>Browser: AES-KW unwrap(wrappedContentKey, sessionKey) → contentKey

  Note over W,PG: FASE 2 — Redacción de la denuncia

  W->>Browser: Rellena el formulario (3 pasos: contexto, relato, evidencias)
  Browser->>Browser: Zod validate (paso1Schema, paso2Schema, paso3Schema)

  Note over W,PG: FASE 3 — Cifrado local (ANTES de salir del navegador)

  Browser->>Browser: contentKey = generateKey() [anónima] o unwrapped key [identificada]
  Browser->>Browser: ciphertext = AES-256-GCM encrypt(relatoTexto, contentKey, IV)
  loop Por cada archivo de evidencia
    Browser->>Browser: sha256Hash = SHA-256(file.arrayBuffer)
    Browser->>Browser: { iv, encCiphertext } = AES-256-GCM encryptBinary(file, contentKey)
  end

  Note over W,PG: FASE 4 — Envío (solo ciphertext al servidor)

  Browser->>API: POST /api/v1/denuncias<br/>{ ciphertextB64, ivB64, evidencias[{ sha256Hash, ivB64, ciphertextB64, name, type, size }] }
  Note right of API: El servidor NUNCA ve el plaintext.<br/>Solo almacena bytes cifrados.
  API->>API: Genera trackingCode (32^10, sin ambiguos)
  API->>PG: INSERT INTO {schema}.denuncias (ciphertext_b64, iv_b64, tracking_code, estado, ...)
  API->>PG: INSERT INTO {schema}.evidencias (...) por cada archivo
  API-->>Browser: { trackingCode, fechaRegistro }

  Note over W,PG: FASE 5 — Entrega del código al trabajador/a

  Browser->>W: Muestra <TrackingCodeDisplay code={trackingCode} />
  W->>W: Guarda el código (única forma de acceder a su denuncia)

  Note over W,PG: FASE 6 — Seguimiento posterior (sin login)

  W->>Browser: Introduce trackingCode en /worker/seguimiento
  Browser->>API: GET /api/v1/denuncias/seguimiento?codigo={trackingCode}
  API->>PG: SELECT estado, mensajes_cifrados FROM {schema}.denuncias WHERE tracking_code = $1
  API-->>Browser: { estado, ultimaActualizacion, mensajesCifrados[] }
  Note right of Browser: Los mensajes cifrados se descifran en cliente<br/>con la clave derivada del trackingCode (si aplica)
```

## Modelo de claves para denuncia anónima

```
trackingCode (32 chars, visible al usuario)
     │
     └─► PBKDF2(trackingCode, salt_fijo_por_tenant, 600k iter)
              │
              └─► anonymousContentKey (AES-256)
                       │
                       ├─► encrypt(relato) → ciphertext almacenado en PG
                       └─► encryptBinary(evidencia) → ciphertext almacenado en PG
```

El servidor almacena el `salt_fijo_por_tenant` (no secreto), el ciphertext y el IV.
**Nunca** almacena la clave derivada ni el plaintext.

## Modelo de claves para denuncia identificada

```
password del usuario
     │
     └─► PBKDF2(password, salt_usuario, 600k iter) → sessionKey
              │
              └─► AES-KW unwrap(wrappedContentKey) → contentKey
                       │
                       ├─► encrypt(relato) → ciphertext
                       └─► encryptBinary(evidencia) → ciphertext
```

El `wrappedContentKey` (envuelto con sessionKey) se almacena en PG junto al usuario.
Si el usuario cambia su contraseña, se re-genera sessionKey y se re-envuelve contentKey.

## Garantías legales cubiertas

| Requisito | Cómo se cubre |
|---|---|
| Ley 2/2023 art. 16 — anonimato garantizado | El servidor no puede identificar al denunciante anónimo |
| RGPD art. 25 — privacidad por diseño | Cifrado E2E; servidor procesa solo ciphertext |
| Ley 2/2023 art. 9 — confidencialidad | Incluso los administradores de BD no pueden leer denuncias |
| Integridad de evidencias | SHA-256 del original guardado y verificable |
