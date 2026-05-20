// ============================================================
// SafeWork AI — Tests unitarios del módulo de cifrado
// Ejecutar con: vitest (Node ≥ 20 tiene Web Crypto API nativa)
// ============================================================

import { describe, it, expect, beforeAll } from "vitest";
import {
  generateKey,
  exportKey,
  importKey,
  encrypt,
  decrypt,
  encryptBinary,
  decryptBinary,
  deriveKeyFromPassword,
  generateSalt,
  wrapKey,
  unwrapKey,
  sha256,
  verifyIntegrity,
  generateTrackingCode,
  generateToken,
  CRYPTO_CONSTANTS,
} from "../index.ts";

// ============================================================
// SECCIÓN 1 — Gestión de claves
// ============================================================

describe("generateKey", () => {
  it("genera una CryptoKey AES-256-GCM válida", async () => {
    const key = await generateKey();
    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
    expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
    expect(key.extractable).toBe(true);
    expect(key.usages).toContain("encrypt");
    expect(key.usages).toContain("decrypt");
  });

  it("genera claves distintas en cada llamada", async () => {
    const key1 = await generateKey();
    const key2 = await generateKey();
    const b64_1 = await exportKey(key1);
    const b64_2 = await exportKey(key2);
    expect(b64_1).not.toBe(b64_2);
  });
});

describe("exportKey / importKey", () => {
  it("round-trip: exportar e importar produce clave equivalente", async () => {
    const original = await generateKey();
    const b64 = await exportKey(original);
    const imported = await importKey(b64);

    // Verificar que la clave importada puede cifrar/descifrar correctamente
    const plaintext = "test de round-trip";
    const ciphertext = await encrypt(plaintext, imported);
    const recovered = await decrypt(ciphertext, original);
    expect(recovered).toBe(plaintext);
  });

  it("la clave exportada tiene 44 caracteres Base64 (256 bits = 32 bytes)", async () => {
    const key = await generateKey();
    const b64 = await exportKey(key);
    // 32 bytes → Base64 → 44 chars (con padding)
    expect(b64.length).toBe(44);
  });
});

// ============================================================
// SECCIÓN 2 — Cifrado y descifrado de texto
// ============================================================

describe("encrypt / decrypt", () => {
  let key: CryptoKey;

  beforeAll(async () => {
    key = await generateKey();
  });

  it("cifra y descifra texto correctamente", async () => {
    const plaintext = "Esta es una denuncia de prueba 🔒";
    const ciphertext = await encrypt(plaintext, key);
    const recovered = await decrypt(ciphertext, key);
    expect(recovered).toBe(plaintext);
  });

  it("el ciphertext es diferente del plaintext", async () => {
    const plaintext = "contenido sensible";
    const ciphertext = await encrypt(plaintext, key);
    expect(ciphertext).not.toContain(plaintext);
  });

  it("cifrados del mismo texto producen outputs distintos (IV aleatorio)", async () => {
    const plaintext = "mismo texto";
    const cipher1 = await encrypt(plaintext, key);
    const cipher2 = await encrypt(plaintext, key);
    // Cada cifrado usa un IV diferente → outputs diferentes
    expect(cipher1).not.toBe(cipher2);
  });

  it("descifrar con clave incorrecta lanza error", async () => {
    const plaintext = "texto secreto";
    const ciphertext = await encrypt(plaintext, key);
    const wrongKey = await generateKey();
    await expect(decrypt(ciphertext, wrongKey)).rejects.toThrow("CRYPTO_DECRYPT_FAILED");
  });

  it("descifrar ciphertext manipulado lanza error", async () => {
    const plaintext = "texto secreto";
    const ciphertext = await encrypt(plaintext, key);
    // Manipular el último byte del ciphertext
    const bytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = btoa(String.fromCharCode(...bytes));
    await expect(decrypt(tampered, key)).rejects.toThrow("CRYPTO_DECRYPT_FAILED");
  });

  it("cifra y descifra strings vacíos", async () => {
    const ciphertext = await encrypt("", key);
    const recovered = await decrypt(ciphertext, key);
    expect(recovered).toBe("");
  });

  it("cifra y descifra texto muy largo (10.000 caracteres)", async () => {
    const plaintext = "a".repeat(10_000);
    const ciphertext = await encrypt(plaintext, key);
    const recovered = await decrypt(ciphertext, key);
    expect(recovered).toBe(plaintext);
  });

  it("cifra y descifra caracteres Unicode y emoji", async () => {
    const plaintext = "Ñoño 中文 🎉 العربية ünïcödé";
    const ciphertext = await encrypt(plaintext, key);
    const recovered = await decrypt(ciphertext, key);
    expect(recovered).toBe(plaintext);
  });
});

// ============================================================
// SECCIÓN 3 — Cifrado de datos binarios
// ============================================================

describe("encryptBinary / decryptBinary", () => {
  let key: CryptoKey;

  beforeAll(async () => {
    key = await generateKey();
  });

  it("cifra y descifra un ArrayBuffer correctamente", async () => {
    const original = new Uint8Array([1, 2, 3, 4, 255, 0, 128]).buffer;
    const { iv, ciphertext } = await encryptBinary(original, key);
    const recovered = await decryptBinary(ciphertext, iv, key);
    expect(new Uint8Array(recovered)).toEqual(new Uint8Array(original));
  });

  it("IVs distintos en cada cifrado", async () => {
    const data = new Uint8Array([1, 2, 3]).buffer;
    const r1 = await encryptBinary(data, key);
    const r2 = await encryptBinary(data, key);
    expect(r1.iv).not.toEqual(r2.iv);
  });

  it("IV tiene longitud correcta (12 bytes)", async () => {
    const data = new Uint8Array([1]).buffer;
    const { iv } = await encryptBinary(data, key);
    expect(iv.length).toBe(CRYPTO_CONSTANTS.IV_LENGTH);
  });
});

// ============================================================
// SECCIÓN 4 — PBKDF2: derivación de clave desde contraseña
// ============================================================

describe("deriveKeyFromPassword", () => {
  const password = "contraseña-super-segura-123!";

  it("deriva una CryptoKey con usages wrapKey/unwrapKey", async () => {
    const salt = generateSalt();
    const key = await deriveKeyFromPassword(password, salt);
    expect(key.usages).toContain("wrapKey");
    expect(key.usages).toContain("unwrapKey");
  });

  it("la clave derivada NO es extractable (seguridad)", async () => {
    const salt = generateSalt();
    const key = await deriveKeyFromPassword(password, salt);
    expect(key.extractable).toBe(false);
  });

  it("misma contraseña + mismo salt → misma clave (determinista)", async () => {
    const salt = generateSalt();
    const key1 = await deriveKeyFromPassword(password, salt);
    const key2 = await deriveKeyFromPassword(password, salt);
    // Verificar indirectamente: ambas claves envuelven la misma clave de contenido
    const contentKey = await generateKey();
    const wrapped1 = await wrapKey(contentKey, key1);
    const wrapped2 = await wrapKey(contentKey, key2);
    expect(wrapped1).toBe(wrapped2);
  });

  it("salt distinto → clave distinta con misma contraseña", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = await deriveKeyFromPassword(password, salt1);
    const key2 = await deriveKeyFromPassword(password, salt2);
    const contentKey = await generateKey();
    const wrapped1 = await wrapKey(contentKey, key1);
    const wrapped2 = await wrapKey(contentKey, key2);
    expect(wrapped1).not.toBe(wrapped2);
  });

  it("contraseña incorrecta → no puede desenvolver la clave", async () => {
    const salt = generateSalt();
    const correctKey = await deriveKeyFromPassword(password, salt);
    const wrongKey = await deriveKeyFromPassword("contraseña-incorrecta!", salt);
    const contentKey = await generateKey();
    const wrapped = await wrapKey(contentKey, correctKey);
    await expect(unwrapKey(wrapped, wrongKey)).rejects.toThrow("CRYPTO_UNWRAP_FAILED");
  });
});

describe("generateSalt", () => {
  it("genera un salt de 32 bytes", () => {
    const salt = generateSalt();
    expect(salt.length).toBe(CRYPTO_CONSTANTS.PBKDF2_SALT_BYTES);
  });

  it("genera salts distintos en cada llamada", () => {
    const s1 = generateSalt();
    const s2 = generateSalt();
    expect(s1).not.toEqual(s2);
  });
});

// ============================================================
// SECCIÓN 5 — wrapKey / unwrapKey
// ============================================================

describe("wrapKey / unwrapKey", () => {
  let wrappingKey: CryptoKey;
  let contentKey: CryptoKey;

  beforeAll(async () => {
    const password = "clave-maestra-segura";
    const salt = generateSalt();
    wrappingKey = await deriveKeyFromPassword(password, salt);
    contentKey = await generateKey();
  });

  it("round-trip: envolver y desenvolver produce clave equivalente", async () => {
    const wrapped = await wrapKey(contentKey, wrappingKey);
    const unwrapped = await unwrapKey(wrapped, wrappingKey);
    // La clave desenvolvida debe cifrar/descifrar como la original
    const plaintext = "prueba de round-trip de clave";
    const cipher = await encrypt(plaintext, contentKey);
    const recovered = await decrypt(cipher, unwrapped);
    expect(recovered).toBe(plaintext);
  });

  it("la clave envuelta es una cadena Base64 no vacía", async () => {
    const wrapped = await wrapKey(contentKey, wrappingKey);
    expect(typeof wrapped).toBe("string");
    expect(wrapped.length).toBeGreaterThan(0);
    // AES-KW añade 8 bytes de overhead a 32 bytes de clave → 40 bytes → ~56 chars Base64
    expect(wrapped.length).toBeGreaterThanOrEqual(50);
  });

  it("desenvolver con clave incorrecta lanza error", async () => {
    const wrongPassword = "contraseña-equivocada";
    const salt = generateSalt();
    const wrongKey = await deriveKeyFromPassword(wrongPassword, salt);
    const wrapped = await wrapKey(contentKey, wrappingKey);
    await expect(unwrapKey(wrapped, wrongKey)).rejects.toThrow("CRYPTO_UNWRAP_FAILED");
  });
});

// ============================================================
// SECCIÓN 6 — SHA-256 e integridad de evidencias
// ============================================================

describe("sha256", () => {
  it("produce hash hex de 64 caracteres", async () => {
    const data = new TextEncoder().encode("test").buffer;
    const hash = await sha256(data);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("vector conocido NIST: SHA-256('abc')", async () => {
    // SHA-256 de "abc" = ba7816bf8f01cfea414140de5dae2223...
    const data = new TextEncoder().encode("abc").buffer;
    const hash = await sha256(data);
    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("vector conocido NIST: SHA-256('')", async () => {
    // SHA-256 de "" = e3b0c44298fc1c149afb...
    const data = new ArrayBuffer(0);
    const hash = await sha256(data);
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("datos distintos producen hashes distintos", async () => {
    const d1 = new TextEncoder().encode("dato1").buffer;
    const d2 = new TextEncoder().encode("dato2").buffer;
    expect(await sha256(d1)).not.toBe(await sha256(d2));
  });

  it("mismo dato siempre produce el mismo hash (determinista)", async () => {
    const data = new TextEncoder().encode("evidencia.pdf").buffer;
    const h1 = await sha256(data);
    const h2 = await sha256(data);
    expect(h1).toBe(h2);
  });
});

describe("verifyIntegrity", () => {
  it("devuelve true cuando los datos coinciden con el hash", async () => {
    const data = new TextEncoder().encode("archivo de prueba").buffer;
    const hash = await sha256(data);
    expect(await verifyIntegrity(data, hash)).toBe(true);
  });

  it("devuelve false cuando los datos han sido manipulados", async () => {
    const original = new TextEncoder().encode("archivo original").buffer;
    const hash = await sha256(original);
    const tampered = new TextEncoder().encode("archivo manipulado").buffer;
    expect(await verifyIntegrity(tampered, hash)).toBe(false);
  });

  it("devuelve false con hash incorrecto", async () => {
    const data = new TextEncoder().encode("datos").buffer;
    const wrongHash = "a".repeat(64);
    expect(await verifyIntegrity(data, wrongHash)).toBe(false);
  });
});

// ============================================================
// SECCIÓN 7 — Códigos de seguimiento y tokens
// ============================================================

describe("generateTrackingCode", () => {
  it("genera un código de 10 caracteres", () => {
    const code = generateTrackingCode();
    expect(code).toHaveLength(CRYPTO_CONSTANTS.TRACKING_LENGTH);
  });

  it("solo contiene caracteres del alfabeto permitido", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateTrackingCode();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
    }
  });

  it("no contiene caracteres ambiguos (0, O, 1, I)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateTrackingCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("genera códigos distintos en llamadas sucesivas", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateTrackingCode()));
    // Con 32^10 posibilidades es prácticamente imposible una colisión en 100 intentos
    expect(codes.size).toBe(100);
  });
});

describe("generateToken", () => {
  it("genera un token hex de longitud correcta (32 bytes = 64 chars)", () => {
    const token = generateToken(32);
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("acepta tamaño personalizado", () => {
    const token16 = generateToken(16);
    expect(token16).toHaveLength(32);
  });

  it("genera tokens distintos en cada llamada", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});

// ============================================================
// SECCIÓN 8 — Constantes verificadas
// ============================================================

describe("CRYPTO_CONSTANTS", () => {
  it("PBKDF2_ITERATIONS es 600.000 (OWASP 2023)", () => {
    expect(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS).toBe(600_000);
  });

  it("AES_KEY_LENGTH es 256 bits", () => {
    expect(CRYPTO_CONSTANTS.AES_KEY_LENGTH).toBe(256);
  });

  it("IV_LENGTH es 12 bytes (96 bits, recomendado para AES-GCM)", () => {
    expect(CRYPTO_CONSTANTS.IV_LENGTH).toBe(12);
  });

  it("PBKDF2_SALT_BYTES es 32 bytes (256 bits)", () => {
    expect(CRYPTO_CONSTANTS.PBKDF2_SALT_BYTES).toBe(32);
  });
});
