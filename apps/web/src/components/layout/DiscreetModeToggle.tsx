"use client";
/**
 * DiscreetModeToggle — renombra la PWA a "Notas" en el título y
 * reemplaza la UI por una pantalla de calculadora si alguien mira.
 * Activado con un triple-click o el toggle del sidebar.
 */
import { useEffect } from "react";
import { EyeOff, Eye } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function DiscreetModeToggle() {
  const { discreteMode, toggleDiscreteMode } = useUIStore();

  useEffect(() => {
    // Cambia el título del documento para que en la barra de tareas aparezca como "Notas"
    document.title = discreteMode ? "Notas" : "SafeWork AI";

    // Cambia el favicon (opcional — necesita /public/favicon-discreet.ico)
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (link) {
      link.href = discreteMode ? "/favicon-discreet.ico" : "/favicon.ico";
    }
  }, [discreteMode]);

  return (
    <button
      type="button"
      onClick={toggleDiscreteMode}
      aria-pressed={discreteMode}
      aria-label={discreteMode ? "Desactivar modo discreto" : "Activar modo discreto"}
      className="flex min-h-tap w-full items-center gap-2 rounded-lg px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {discreteMode ? (
        <Eye size={14} aria-hidden="true" />
      ) : (
        <EyeOff size={14} aria-hidden="true" />
      )}
      {discreteMode ? "Mostrar SafeWork AI" : "Modo discreto"}
    </button>
  );
}
