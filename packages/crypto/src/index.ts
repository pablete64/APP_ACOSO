// ============================================================
// SafeWork AI — Módulo de cifrado E2E
// Web Crypto API — nativa en browser y Node ≥ 20 (sin deps externas)
//
// MODELO DE CLAVES:
//   - Cada denuncia/conversación tiene su propia CryptoKey (clave de contenido)
//   - La clave de contenido se envuelve (wrapKey) con la clave de sesión del usuario
//   - La clave de sesión se deriva de la contraseña con PBKDF2 (deriveKeyFromPassword)
//   - El servidor NUNCA recibe claves en claro, solo ciphertext + wrapped keys
// ============================================================

// --- Constantes ---

const AES_ALGORITHM  = "AES-GCM"   as const;
const AES_KEY_LENGTH = 256          as const;
const IV_LENGTH      = 12           as const; // 96 bits — recomendado para AES-GCM
const AUTH_TAG_BITS  = 128          as const; // máximo — defecto en Web Crypto API

const PBKDF2_HASH       = "SHA-256"   as const;
const PBKDF2_ITERATIONS = 600_000     as const; // OWASP 2023 para SHA-256
const PBKDF2_SALT_BYTES = 32          as const; // 256 bits

const WRAP_ALGORITHM = "AES-KW" as const; // AES Key Wrap (RFC 3394) — sin IV, determinista

// Alfabeto para tracking codes: sin 0/O/1/I para evitar confusión visual
const TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRACKING_LENGTH   = 10;

// --- Helpers internos ---

function u8(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function b64Encode(bytes: Uint8Array): string {
  // Usa chunk para evitar desbordamiento de pila en Arrays grandes
  const CHUNK = 8192;
  let result = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    result += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(result);
}

function b64Decode(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ============================================================
// SECCIÓN 1 — Gestión de claves AES-256-GCM
// ============================================================

/** Genera una nueva clave AES-256-GCM (clave de contenido). */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,  // extractable — necesario para wrapKey
    ["encrypt", "decrypt"]
  );
}

/** Exporta una CryptoKey a Base64 (solo para wrapping, nunca enviar al servidor en claro). */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return b64Encode(u8(raw));
}

/** Importa una clave AES-256-GCM desde Base64. */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    b64Decode(base64Key),
    { name: AES_ALGORITHM },
    true,
    ["encrypt", "decrypt"]
  );
}

// ============================================================
// SECCIÓN 2 — Cifrado / Descifrado de contenido
// ============================================================

/**
 * Cifra un string con AES-256-GCM.
 * Formato de salida (Base64): [IV (12 bytes)] [ciphertext + auth tag (variable)]
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv, tagLength: AUTH_TAG_BITS },
    key,
    encoded
  );

  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(u8(ciphertext), IV_LENGTH);
  return b64Encode(result);
}

/**
 * Descifra un string cifrado con `encrypt`.
 * Lanza un error si la clave es incorrecta o el ciphertext está manipulado.
 */
export async function decrypt(ciphertextB64: string, key: CryptoKey): Promise<string> {
  const bytes      = b64Decode(ciphertextB64);
  const iv         = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv, tagLength: AUTH_TAG_BITS },
      key,
      ciphertext
    );
  } catch {
    throw new Error("CRYPTO_DECRYPT_FAILED: clave incorrecta o datos manipulados");
  }

  return new TextDecoder().decode(plaintext);
}

/**
 * Cifra datos binarios (p.ej. archivos) con AES-256-GCM.
 * Devuelve el IV y el ciphertext por separado para facilitar el almacenamiento.
 */
export async function encryptBinary(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv, tagLength: AUTH_TAG_BITS },
    key,
    data
  );
  return { iv, ciphertext: u8(ciphertext) };
}

/** Descifra datos binarios cifrados con `encryptBinary`. */
export async function decryptBinary(
  ciphertext: ArrayBuffer,
  iv: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  try {
    return await crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv, tagLength: AUTH_TAG_BITS },
      key,
      ciphertext
    );
  } catch {
    throw new Error("CRYPTO_DECRYPT_FAILED: clave incorrecta o datos manipulados");
  }
}

// ============================================================
// SECCIÓN 3 — Derivación de clave desde contraseña (PBKDF2)
// ============================================================

/**
 * Genera un salt criptográficamente aleatorio para PBKDF2.
 * El salt debe guardarse junto al material cifrado (no es secreto).
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
}

/**
 * Deriva una clave AES-256-GCM desde una contraseña usando PBKDF2.
 * Parámetros: SHA-256, 600.000 iteraciones (OWASP 2023).
 *
 * USO: la clave derivada sirve para envolver (wrapKey) la clave de contenido.
 * NUNCA cifrar datos de usuario directamente con la clave derivada.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    // Importante: la clave derivada se usa para envolver con AES-KW (no AES-GCM)
    { name: WRAP_ALGORITHM, length: AES_KEY_LENGTH },
    false, // la clave derivada NO es extractable (no se puede exportar)
    ["wrapKey", "unwrapKey"]
  );
}

// ============================================================
// SECCIÓN 4 — Envolvimiento de claves (AES-KW / Key Wrapping)
// ============================================================

/**
 * Envuelve (cifra) una clave de contenido con una clave maestra.
 * Algoritmo: AES-KW (RFC 3394) — sin IV, determinista.
 *
 * USO: guardar el resultado en servidor. La clave maestra NUNCA sale del cliente.
 */
export async function wrapKey(
  contentKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey("raw", contentKey, wrappingKey, {
    name: WRAP_ALGORITHM,
  });
  return b64Encode(u8(wrapped));
}

/**
 * Desenvuelve (descifra) una clave de contenido con la clave maestra.
 * Devuelve la clave lista para encrypt/decrypt.
 */
export async function unwrapKey(
  wrappedKeyB64: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.unwrapKey(
      "raw",
      b64Decode(wrappedKeyB64) as BufferSource,
      wrappingKey,
      { name: WRAP_ALGORITHM },
      { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    throw new Error("CRYPTO_UNWRAP_FAILED: clave maestra incorrecta o datos corruptos");
  }
}

// ============================================================
// SECCIÓN 5 — Integridad de evidencias (SHA-256)
// ============================================================

/**
 * Calcula el hash SHA-256 de un ArrayBuffer (p.ej. un archivo).
 * Debe ejecutarse ANTES de cifrar para garantizar integridad del original.
 * El hash (hex) se envía al servidor junto con la evidencia cifrada.
 */
export async function sha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(u8(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifica que un archivo coincide con su hash SHA-256 almacenado.
 * Devuelve true si el archivo es íntegro, false si fue manipulado.
 */
export async function verifyIntegrity(
  data: ArrayBuffer,
  expectedHex: string
): Promise<boolean> {
  const actual = await sha256(data);
  // Comparación en tiempo constante (evitar timing attacks)
  if (actual.length !== expectedHex.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

// ============================================================
// SECCIÓN 6 — Códigos de seguimiento
// ============================================================

/**
 * Genera un código de seguimiento de denuncia criptográficamente aleatorio.
 * 10 caracteres del alfabeto sin ambigüedades (sin 0/O/1/I).
 * Espacio de posibilidades: 32^10 ≈ 1.1 × 10^15 — resistente a fuerza bruta.
 */
export function generateTrackingCode(): string {
  const array = crypto.getRandomValues(new Uint8Array(TRACKING_LENGTH));
  return Array.from(array, (b) => TRACKING_ALPHABET[b % TRACKING_ALPHABET.length]!).join("");
}

/**
 * Genera un token aleatorio de N bytes codificado en hex.
 * Uso: tokens temporales, IDs de sesión internos.
 */
export function generateToken(bytes = 32): string {
  const array = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================
// SECCIÓN 7 — Exportaciones de constantes (para tests y docs)
// ============================================================

export const CRYPTO_CONSTANTS = {
  AES_KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_BITS,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_BYTES,
  PBKDF2_HASH,
  TRACKING_LENGTH,
  TRACKING_ALPHABET,
} as const;
