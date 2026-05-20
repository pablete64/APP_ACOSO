"use client";
/**
 * CryptoProvider — gestiona la content key E2E en memoria de React.
 * La clave NUNCA toca localStorage ni sessionStorage.
 * Al cerrar sesión / refrescar página → se pierde y se re-deriva.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  generateKey,
  encrypt,
  decrypt,
  encryptBinary,
  decryptBinary,
  deriveKeyFromPassword,
  wrapKey,
  unwrapKey,
  sha256,
  generateSalt,
  exportKey,
  importKey,
} from "@safework/crypto";

interface CryptoContextValue {
  /** true si la clave está lista en memoria */
  ready: boolean;
  /** Inicializa la clave desde password + salt (login identificado) */
  initFromPassword: (password: string, saltB64: string, wrappedKeyB64: string) => Promise<void>;
  /** Inicializa una clave nueva (denuncia anónima) */
  initAnonymous: () => Promise<{ keyB64: string }>;
  /** Cifra texto plano */
  encrypt: (plaintext: string) => Promise<string>;
  /** Descifra ciphertext base64 */
  decrypt: (ciphertextB64: string) => Promise<string>;
  /** Cifra un ArrayBuffer (evidencias) */
  encryptBinary: (data: ArrayBuffer) => Promise<{ iv: string; ciphertext: string }>;
  /** SHA-256 de un ArrayBuffer */
  sha256: (data: ArrayBuffer) => Promise<string>;
  /** Libera la clave de memoria (logout) */
  clear: () => void;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  // La clave vive en un ref — no provoca re-renders y no se serializa
  const keyRef = useRef<CryptoKey | null>(null);
  const [ready, setReady] = useState(false);

  const initFromPassword = useCallback(
    async (password: string, saltB64: string, wrappedKeyB64: string) => {
      const saltBytes = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
      const sessionKey = await deriveKeyFromPassword(password, saltBytes);
      const contentKey = await unwrapKey(wrappedKeyB64, sessionKey);
      keyRef.current = contentKey;
      setReady(true);
    },
    []
  );

  const initAnonymous = useCallback(async () => {
    const contentKey = await generateKey();
    keyRef.current = contentKey;
    setReady(true);
    const keyB64 = await exportKey(contentKey);
    return { keyB64 };
  }, []);

  const encryptFn = useCallback(async (plaintext: string) => {
    if (!keyRef.current) throw new Error("CryptoProvider: clave no inicializada");
    return encrypt(plaintext, keyRef.current);
  }, []);

  const decryptFn = useCallback(async (ciphertextB64: string) => {
    if (!keyRef.current) throw new Error("CryptoProvider: clave no inicializada");
    return decrypt(ciphertextB64, keyRef.current);
  }, []);

  const encryptBinaryFn = useCallback(async (data: ArrayBuffer) => {
    if (!keyRef.current) throw new Error("CryptoProvider: clave no inicializada");
    const result = await encryptBinary(data, keyRef.current);
    const toB64 = (arr: Uint8Array | ArrayBuffer) =>
      btoa(String.fromCharCode(...new Uint8Array(arr)));
    return {
      iv:         toB64(result.iv),
      ciphertext: toB64(result.ciphertext),
    };
  }, []);

  const sha256Fn = useCallback(async (data: ArrayBuffer) => {
    return sha256(data);
  }, []);

  const clear = useCallback(() => {
    keyRef.current = null;
    setReady(false);
  }, []);

  return (
    <CryptoContext.Provider
      value={{
        ready,
        initFromPassword,
        initAnonymous,
        encrypt:       encryptFn,
        decrypt:       decryptFn,
        encryptBinary: encryptBinaryFn,
        sha256:        sha256Fn,
        clear,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error("useCrypto debe usarse dentro de <CryptoProvider>");
  return ctx;
}
