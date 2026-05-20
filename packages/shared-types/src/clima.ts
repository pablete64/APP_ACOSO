// ============================================================
// SafeWork AI — Tipos del M7: Termómetro de clima laboral
//               y M6: Reporting / Dashboard
// ============================================================

// --- Enums clima (M7) ---

// Dimensiones del modelo FPSICO / INSST
export type DimensionFpsico =
  | "carga_trabajo"
  | "autonomia"
  | "apoyo_social"
  | "relaciones"
  | "conflicto_rol"
  | "participacion"
  | "interes_compensacion"
  | "desempeno_rol";

export type NivelRiesgoClimaLaboral =
  | "muy_adecuado"    // índice ≥ 80
  | "adecuado"        // índice 60–79
  | "moderado"        // índice 40–59
  | "elevado"         // índice 20–39
  | "muy_elevado";    // índice < 20

// --- Encuesta (M7) ---

export interface PreguntaClima {
  id: string;
  encuestaId: string;
  orden: number;
  enunciado: string;
  dimension: DimensionFpsico;
  escala: "likert_5" | "likert_7" | "binaria";
}

export interface EncuestaClima {
  id: string;
  empresaId: string;
  mes: string;                          // "2026-05" — siempre primer día del mes
  activa: boolean;
  preguntas: PreguntaClima[];
  departamentos: string[];              // a qué departamentos se envía
  fechaLimiteRespuesta: string;
  numRespuestasMinimas: number;         // k-anonimato: mínimo para mostrar resultados
  createdAt: string;
}

// La respuesta NO tiene FK a usuario — anonimato real
export interface RespuestaClima {
  id: string;
  encuestaId: string;
  departamento: string;                 // solo agregado por departamento
  respuestas: Record<string, number>;   // preguntaId → valor numérico
  respondidaAt: string;
  // Sin usuarioId, sin IP, sin ningún identificador
}

// --- Indicadores agregados (M7) ---

export interface IndicadorDimension {
  dimension: DimensionFpsico;
  puntuacion: number;                   // 0-100
  nivelRiesgo: NivelRiesgoClimaLaboral;
  variacionMesAnterior?: number;        // +/- puntos
}

export interface IndicadorClima {
  encuestaId: string;
  empresaId: string;
  mes: string;
  departamento?: string;               // null = empresa completa
  numRespuestas: number;
  satisfaceKAnonimato: boolean;        // false → no se muestran resultados
  indiceGlobal: number;               // 0-100
  nivelRiesgoGlobal: NivelRiesgoClimaLaboral;
  dimensiones: IndicadorDimension[];
  alertaEnviada: boolean;
  tendencia: "mejora" | "estable" | "deterioro" | "sin_datos";
  calculadoAt: string;
}

// --- Dashboard ejecutivo (M6) ---

export interface KpisDashboard {
  periodo: string;                      // "2026-Q1", "2026-05", "2026"
  // Canal de denuncia
  totalDenuncias: number;
  denunciasPorEstado: Record<string, number>;
  tiempoMedioResolucionDias: number;
  // Formación
  coberturaFormativa: number;           // % de empleados con al menos 1 curso completado
  certificadosEmitidos: number;
  // Clima
  indiceClimaGlobal?: number;
  departamentosEnRiesgo: number;
  // Cumplimiento
  protocoloVigente: boolean;
  dpaFirmado: boolean;
  formacionObligatoriaCompletada: boolean;
}

// Informe del Plan de Igualdad (sección de acoso)
export interface InformePlanIgualdad {
  empresaId: string;
  anio: number;
  fechaGeneracion: string;
  kpis: KpisDashboard;
  medidasAdoptadas: string[];           // lista de medidas del protocolo
  indicadoresClimaAnuales: IndicadorClima[];
  certificadosFormacion: number;
  incidencias: number;
  resolucionesFavorables: number;
  tiempoMedioResolucionDias: number;
  firmaResponsable?: string;
}
