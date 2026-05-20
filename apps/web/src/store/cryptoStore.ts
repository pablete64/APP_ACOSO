import { create } from "zustand";

/**
 * cryptoStore — clave de contenido E2E en memoria Zustand.
 * NO se persiste: al recargar la página se pierde y se re-deriva del login.
 * NO usar `persist` aquí bajo ningún concepto.
 */
interface CryptoState {
  contentKey: CryptoKey | null;
  setContentKey: (key: CryptoKey) => void;
  clearContentKey: () => void;
}

export const useCryptoStore = create<CryptoState>()((set) => ({
  contentKey:      null,
  setContentKey:   (key) => set({ contentKey: key }),
  clearContentKey: () => set({ contentKey: null }),
}));
