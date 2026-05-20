// ============================================================
// SafeWork AI — Tipos de eventos Google Analytics 4
// Alineado con apps/web/src/lib/analytics/google-analytics.ts
//
// IMPORTANTE: NINGÚN evento puede contener datos personales,
// IDs de usuario, contenido de denuncias ni nada identificativo.
// Todos los eventos son anonimizados por diseño (RGPD).
// ============================================================

// Categorías de eventos (= módulos SafeWork AI)
export type CategoriaGA4 =
  | "M1_Canal"
  | "M2_Asistente"
  | "M3_Formacion"
  | "M4_Contacto"
  | "M5_Expedientes"
  | "M6_Dashboard"
  | "M7_Clima"
  | "M8_Mediacion"
  | "Auth"
  | "UI";

// Acciones de eventos
export type AccionGA4 =
  // M1 — Canal de denuncia
  | "iniciar_denuncia"
  | "completar_denuncia"
  | "abandonar_denuncia"
  | "descargar_tracking_code"
  | "consultar_seguimiento"
  // M2 — Asistente IA
  | "abrir_asistente"
  | "cerrar_asistente"
  | "borrar_conversacion"
  | "derivacion_asistente"
  // M3 — Formación
  | "iniciar_curso"
  | "completar_modulo"
  | "completar_curso"
  | "descargar_certificado"
  | "ver_recurso_normativo"
  // M4 — Contacto
  | "solicitar_cita"
  | "enviar_mensaje_interno"
  | "iniciar_videollamada"
  // M7 — Clima
  | "responder_encuesta"
  | "ver_resultados_clima"
  // M6 — Dashboard
  | "generar_informe"
  | "exportar_reporte"
  // Auth
  | "login_exito"
  | "login_fallo"
  | "logout"
  // UI
  | "activar_modo_discreto"
  | "cambiar_idioma"
  | "cambiar_tema";

// Estructura tipada de un evento GA4 de SafeWork AI
export interface EventoGA4 {
  accion: AccionGA4;
  categoria: CategoriaGA4;
  etiqueta?: string;   // info adicional NO identificativa (p.ej. "paso_2", "es")
  valor?: number;      // valor numérico (p.ej. duración en segundos)
}

// Catálogo completo de eventos — sirve como contrato entre analytics y producto
export const EVENTOS_GA4 = {
  denuncia: {
    iniciar:    (): EventoGA4 => ({ accion: "iniciar_denuncia",    categoria: "M1_Canal" }),
    completar:  (): EventoGA4 => ({ accion: "completar_denuncia",  categoria: "M1_Canal" }),
    abandonar:  (paso: number): EventoGA4 => ({ accion: "abandonar_denuncia", categoria: "M1_Canal", etiqueta: `paso_${paso}` }),
    descargarCodigo: (): EventoGA4 => ({ accion: "descargar_tracking_code", categoria: "M1_Canal" }),
    consultarSeguimiento: (): EventoGA4 => ({ accion: "consultar_seguimiento", categoria: "M1_Canal" }),
  },
  asistente: {
    abrir:   (): EventoGA4 => ({ accion: "abrir_asistente",  categoria: "M2_Asistente" }),
    cerrar:  (): EventoGA4 => ({ accion: "cerrar_asistente", categoria: "M2_Asistente" }),
    borrar:  (): EventoGA4 => ({ accion: "borrar_conversacion", categoria: "M2_Asistente" }),
    derivar: (tipo: "recursos_informativos" | "contacto_designada" | "iniciar_denuncia" | "emergencia"): EventoGA4 => ({
      accion: "derivacion_asistente",
      categoria: "M2_Asistente",
      etiqueta: tipo,
    }),
  },
  formacion: {
    iniciarCurso:      (cursoId: string): EventoGA4 => ({ accion: "iniciar_curso",        categoria: "M3_Formacion", etiqueta: cursoId }),
    completarModulo:   (moduloId: string): EventoGA4 => ({ accion: "completar_modulo",     categoria: "M3_Formacion", etiqueta: moduloId }),
    completarCurso:    (cursoId: string): EventoGA4 => ({ accion: "completar_curso",       categoria: "M3_Formacion", etiqueta: cursoId }),
    descargarCertificado: (): EventoGA4 => ({ accion: "descargar_certificado", categoria: "M3_Formacion" }),
    verRecurso: (tipo: string): EventoGA4 => ({ accion: "ver_recurso_normativo", categoria: "M3_Formacion", etiqueta: tipo }),
  },
  contacto: {
    solicitarCita:    (modalidad: string): EventoGA4 => ({ accion: "solicitar_cita",        categoria: "M4_Contacto", etiqueta: modalidad }),
    enviarMensaje:    (): EventoGA4 => ({ accion: "enviar_mensaje_interno",  categoria: "M4_Contacto" }),
    iniciarVideollamada: (): EventoGA4 => ({ accion: "iniciar_videollamada",    categoria: "M4_Contacto" }),
  },
  clima: {
    responder: (): EventoGA4 => ({ accion: "responder_encuesta",   categoria: "M7_Clima" }),
    verResultados: (): EventoGA4 => ({ accion: "ver_resultados_clima", categoria: "M7_Clima" }),
  },
  dashboard: {
    generarInforme: (tipo: string): EventoGA4 => ({ accion: "generar_informe", categoria: "M6_Dashboard", etiqueta: tipo }),
    exportarReporte: (formato: string): EventoGA4 => ({ accion: "exportar_reporte", categoria: "M6_Dashboard", etiqueta: formato }),
  },
  ui: {
    activarModoDiscreto: (): EventoGA4 => ({ accion: "activar_modo_discreto", categoria: "UI" }),
    cambiarIdioma: (idioma: string): EventoGA4 => ({ accion: "cambiar_idioma", categoria: "UI", etiqueta: idioma }),
    cambiarTema: (tema: string): EventoGA4 => ({ accion: "cambiar_tema", categoria: "UI", etiqueta: tema }),
  },
} as const;
