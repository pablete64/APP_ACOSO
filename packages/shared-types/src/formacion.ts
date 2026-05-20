// ============================================================
// SafeWork AI — Tipos del M3: Formación y recursos
// ============================================================

import type { PerfilUsuario } from "./auth.ts";

// --- Enums ---

export type TipoContenido =
  | "video"
  | "texto"
  | "quiz"
  | "infografia"
  | "simulacion"
  | "documento";

export type NivelCurso = "basico" | "intermedio" | "avanzado";

export type EstadoInscripcion = "inscrito" | "en_progreso" | "completado" | "abandonado";

// --- Módulo de formación ---

export interface ModuloFormacion {
  id: string;
  cursoId: string;
  orden: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoContenido;
  duracionMinutos: number;
  urlContenido?: string;          // URL del vídeo, PDF, etc.
  urlTranscripcion?: string;      // accesibilidad: transcripción del vídeo
  tieneQuiz: boolean;
  puntuacionMinima?: number;      // % mínimo para superar el quiz
}

// --- Pregunta de quiz ---

export interface PreguntaQuiz {
  id: string;
  moduloId: string;
  enunciado: string;
  opciones: string[];             // array de textos de opción
  indiceCorrecta: number;
  explicacion?: string;           // explicación de la respuesta correcta
}

// --- Curso ---

export interface CursoFormacion {
  id: string;
  titulo: string;
  descripcion: string;
  nivel: NivelCurso;
  perfilesObjetivo: PerfilUsuario[];
  duracionTotalMinutos: number;
  numModulos: number;
  modulos?: ModuloFormacion[];
  imagenUrl?: string;
  activado: boolean;
  version: string;                // control de cambios normativos
  updatedAt: string;
}

// Resumen para catálogo (sin módulos)
export type CursoResumen = Omit<CursoFormacion, "modulos">;

// --- Progreso del usuario ---

export interface ProgresoModulo {
  moduloId: string;
  completado: boolean;
  porcentaje: number;             // 0-100
  puntuacionQuiz?: number;        // % obtenido en el quiz
  tiempoInvertidoSeg: number;
  completadoAt?: string;
}

export interface ProgresoInscripcion {
  id: string;
  usuarioId: string;
  cursoId: string;
  estado: EstadoInscripcion;
  porcentajeGlobal: number;       // 0-100, calculado del progreso de módulos
  progresoPorModulo: ProgresoModulo[];
  inscritoAt: string;
  completadoAt?: string;
}

// --- Certificado ---

export interface CertificadoFormacion {
  id: string;
  usuarioId: string;
  cursoId: string;
  cursoTitulo: string;
  empresaId: string;
  empresaNombre: string;
  nombreUsuario: string;
  fechaEmision: string;
  firmaDigital?: string;         // firma del responsable de RRHH/Igualdad
  urlPdf?: string;               // URL de descarga del PDF firmado
  codigoVerificacion: string;    // código público para verificar validez
}

// --- Biblioteca normativa ---

export interface RecursoNormativo {
  id: string;
  titulo: string;
  tipo: "ley" | "sentencia" | "guia" | "faq" | "jurisprudencia" | "infografia";
  descripcion: string;
  url: string;
  fechaPublicacion: string;
  organizacion: string;          // BOE, INSST, AEPD, etc.
  etiquetas: string[];
  updatedAt: string;
}
