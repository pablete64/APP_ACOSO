# @safework/crypto — Módulo de cifrado E2E

Implementación de cifrado extremo a extremo para SafeWork AI usando **Web Crypto API nativa** (disponible en todos los navegadores modernos y Node ≥ 20, sin dependencias externas).

---

## Modelo de claves

```
Contraseña de usuario
        │
        ▼ PBKDF2 (SHA-256, 600.000 iter, salt aleatorio 32B)
  Clave de sesión (AES-256, no extractable, usages: wrapKey/unwrapKey)
        │
        ▼ AES-KW (RFC 3394)
  Clave de contenido envuelta ──── se guarda en servidor (opaco)
        │
        ▼ Desenvuelta en cliente con clave de sesión
  Clave de contenido (AES-256-GCM, extractable, usages: encrypt/decrypt)
        │
        ▼ AES-256-GCM (IV aleatorio 12B, auth tag 128B)
  Ciphertext ──────────────────── se guarda en servidor (opaco)
```

**El servidor almacena:**
- La clave de contenido **envuelta** (opaca sin la clave de sesión)
- El ciphertext (opaco sin la clave de contenido)
- El salt PBKDF2 (no es secreto)

**El servidor NUNCA ve:**
- La contraseña del usuario
- La clave de sesión
- La clave de contenido en claro
- El contenido sensible (denuncias, mensajes, conversaciones)

---

## API

### Gestión de claves

```typescript
// Genera nueva clave de contenido AES-256-GCM
const contentKey = await generateKey();

// Exporta la clave a Base64 (solo para wrapKey, no enviar al servidor en claro)
const b64 = await exportKey(contentKey);

// Importa desde Base64
const key = await importKey(b64);
```

### Cifrado de texto

```typescript
const ciphertext = await encrypt("contenido sensible", contentKey);
const plaintext  = await decrypt(ciphertext, contentKey);
```

### Cifrado de archivos (evidencias)

```typescript
// Calcular hash ANTES de cifrar (integridad del original)
const fileBuffer = await file.arrayBuffer();
const hash = await sha256(fileBuffer);       // enviar al servidor

// Cifrar el archivo
const { iv, ciphertext } = await encryptBinary(fileBuffer, contentKey);
// Subir iv + ciphertext al servidor

// Verificar integridad al descargar
const isValid = await verifyIntegrity(downloadedBuffer, storedHash);
```

### Derivación de clave desde contraseña (PBKDF2)

```typescript
const salt = generateSalt();                 // guardar en servidor junto al wrapped key
const sessionKey = await deriveKeyFromPassword(userPassword, salt);

// Envolver la clave de contenido
const wrappedKey = await wrapKey(contentKey, sessionKey);  // guardar en servidor

// Desenvolver (cuando el usuario abre sesión)
const contentKey = await unwrapKey(wrappedKey, sessionKey);
```

### Códigos de seguimiento

```typescript
const trackingCode = generateTrackingCode(); // "A3KMN7PQ2X" — 10 chars, 32^10 posibilidades
const sessionToken = generateToken(32);      // hex, 64 chars
```

---

## Amenazas cubiertas ✅

| Amenaza | Mecanismo de defensa |
|---|---|
| Servidor comprometido lee denuncias | Cifrado E2E — ciphertext opaco sin la clave del usuario |
| Atacante intercepta tráfico (MitM) | HTTPS + contenido ya cifrado antes de salir del cliente |
| Contraseña débil facilita fuerza bruta | PBKDF2 SHA-256 con 600.000 iteraciones (OWASP 2023) |
| Rainbow tables en claves derivadas | Salt aleatorio de 32 bytes por usuario |
| Clave de contenido robada del servidor | Clave envuelta con AES-KW — inutilizable sin la clave de sesión |
| Ciphertext manipulado en tránsito | Auth tag AES-GCM de 128 bits — detecta cualquier modificación |
| Reutilización de IV (cryptographic doom) | IV de 96 bits aleatorio por cada operación de cifrado |
| Evidencia manipulada antes de cifrar | Hash SHA-256 calculado antes de cifrar y almacenado en servidor |
| Timing attack en comparación de hashes | Comparación en tiempo constante en `verifyIntegrity` |
| Caracteres ambiguos en tracking codes | Alfabeto sin 0/O/1/I — reduce errores humanos |

---

## Amenazas NO cubiertas ⚠️

| Amenaza | Por qué no se cubre aquí | Mitigación recomendada |
|---|---|---|
| Dispositivo del usuario comprometido (keylogger, RAT) | Fuera del alcance del cifrado de software | Guías de seguridad al usuario, MFA |
| Contraseña del usuario robada en otro servicio | Reutilización de contraseñas — problema de gestión de credenciales | Política de contraseñas fuertes, detección de brechas |
| Vulnerabilidades en la implementación de Web Crypto en el navegador | La API es provista por el browser/OS | Mantener dependencias actualizadas, bug bounty |
| Pérdida de contraseña sin mecanismo de recuperación | Si el usuario pierde su contraseña y no hay escrow, los datos son irrecuperables | Implementar `wrapKey` con clave de recuperación custodiada |
| Side-channel attacks (timing en JS) | JS no tiene acceso a protecciones de timing a nivel hardware | Aceptado — los timing attacks desde JS son imprácticamente difíciles en este modelo |
| Clave de sesión en memoria del proceso (swapping a disco) | Web Crypto mantiene las claves fuera de la memoria JS | En Node: usar `--disable-mmap` o memoria cifrada del OS |
| Logs del servidor que capturen requests con contenido cifrado | Política de logs — no es problema de cifrado | Política de retención estricta, scrubbing de PII en logs |

---

## Parámetros criptográficos

| Parámetro | Valor | Justificación |
|---|---|---|
| Algoritmo | AES-256-GCM | Autenticado, aprobado NIST, disponible en Web Crypto API |
| Longitud de clave | 256 bits | Resistente a ataques cuánticos (Grover reduce a 128 bits) |
| IV | 96 bits aleatorio | Recomendado por NIST SP 800-38D para GCM |
| Auth tag | 128 bits | Máximo disponible — máxima resistencia a forgery |
| KDF | PBKDF2-SHA-256 | OWASP 2023 recomendado para contraseñas web |
| Iteraciones PBKDF2 | 600.000 | OWASP 2023: 600k para SHA-256 |
| Salt | 256 bits aleatorio | Previene rainbow tables y precomputed attacks |
| Key wrapping | AES-KW (RFC 3394) | Estándar para envolver claves, disponible en Web Crypto API |
| Hashing de evidencias | SHA-256 | Suficiente para integridad; no es contraseña — no necesita KDF |
| Espacio tracking codes | 32^10 ≈ 1.1×10¹⁵ | Resistente a fuerza bruta incluso sin rate limiting |

---

## Tests

```bash
# Desde la raíz del monorepo
npm run test --filter=@safework/crypto

# Directo
cd packages/crypto && npx vitest
```

Los tests cubren:
- Round-trips de cifrado/descifrado (texto y binario)
- Vectores conocidos NIST SHA-256
- Resistencia a clave incorrecta y datos manipulados
- Determinismo de PBKDF2 (mismo password + salt → misma clave)
- Propiedades del alfabeto de tracking codes
- Verificación de todas las constantes criptográficas

---

## Uso en `apps/web`

```typescript
import { generateKey, encrypt, decrypt, wrapKey, deriveKeyFromPassword, generateSalt } from "@safework/crypto";
```

El archivo `apps/web/src/lib/crypto/` debe actuar como wrapper React sobre este módulo, exponiendo un `CryptoProvider` y el hook `useCrypto()` que mantiene la clave de sesión en memoria (nunca en `localStorage`).
