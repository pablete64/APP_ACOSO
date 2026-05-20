import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  discreteMode: boolean;
  theme: "light" | "dark" | "system";
  locale: string;
  toggleDiscreteMode: () => void;
  setTheme: (theme: UIState["theme"]) => void;
  setLocale: (locale: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      discreteMode: false,
      theme:        "system",
      locale:       "es",

      toggleDiscreteMode: () =>
        set((s) => ({ discreteMode: !s.discreteMode })),

      setTheme: (theme) => set({ theme }),

      setLocale: (locale) => set({ locale }),
    }),
    {
      name:    "safework-ui",
      // Solo persistir preferencias — nunca datos sensibles
      partialize: (s) => ({
        theme:  s.theme,
        locale: s.locale,
        // discreteMode no se persiste — se resetea al abrir el navegador
      }),
    }
  )
);
