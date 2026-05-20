declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export function pageview(url: string): void {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
}

export function event(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
}

// Eventos específicos de SafeWork AI (sin datos personales)
export const analytics = {
  denuncia: {
    iniciar: () => event("iniciar_denuncia", "M1_Canal"),
    completar: () => event("completar_denuncia", "M1_Canal"),
    abandonar: (paso: number) => event("abandonar_denuncia", "M1_Canal", `paso_${paso}`),
  },
  asistente: {
    abrir: () => event("abrir_asistente", "M2_Asistente"),
    derivar: (tipo: "recursos" | "contacto" | "expediente") =>
      event("derivacion_asistente", "M2_Asistente", tipo),
  },
  formacion: {
    iniciarCurso: (cursoId: string) => event("iniciar_curso", "M3_Formacion", cursoId),
    completarCurso: (cursoId: string) => event("completar_curso", "M3_Formacion", cursoId),
    descargarCertificado: () => event("descargar_certificado", "M3_Formacion"),
  },
  clima: {
    responderEncuesta: () => event("responder_encuesta", "M7_Clima"),
  },
};
