// ============================================================
// SafeWork AI — Tipos del M2: Asistente IA empático
// ============================================================

// --- Enums ---

export type RolMensajeChatbot = "usuario" | "asistente" | "sistema";

export type EstadoSesionChatbot =
  | "activa"
  | "en_evaluacion"   // fase estructurada de evaluación de indicadores
  | "derivada"        // el asistente ha propuesto una acción concreta
  | "cerrada"         // usuario cerró voluntariamente
  | "expirada";       // por retención (30 días por defecto)

export type DerivacionAsistente =
  | "recursos_informativos"   // links, guías, normativa
  | "contacto_designada"      // abrir chat con persona designada
  | "iniciar_denuncia"        // redirigir a M1
  | "emergencia"              // 024, 112 — ideación suicida o violencia inminente
  | "ninguna";

// --- Evaluación de indicadores (criterios clínicos / legales) ---

// Escala 0–4 donde 0 = no presente, 4 = muy intenso
export type NivelIndicador = 0 | 1 | 2 | 3 | 4;

export interface EvaluacionGravedad {
  gravedad: NivelIndicador;           // intensidad del daño percibido
  reiteracion: NivelIndicador;        // frecuencia (puntual vs. sistemático)
  relacionPoder: NivelIndicador;      // asimetría jerárquica
  impactoEmocional: NivelIndicador;   // ansiedad, miedo, depresión, etc.
  impactoLaboral: NivelIndicador;     // absentismo, rendimiento, baja
  totalScore: number;                 // suma ponderada (calculada en servidor)
  nivelGlobal: "leve" | "moderado" | "grave" | "muy_grave";
  derivacionRecomendada: DerivacionAsistente;
  resumenTexto: string;               // explicación legible generada por IA
  generadoAt: string;
}

// --- Mensajes ---

export interface MensajeChatbot {
  id: string;
  sesionId: string;
  rol: RolMensajeChatbot;
  contenidoCifrado: string;           // cifrado E2E — servidor no lo lee en claro
  metadatos?: {                       // metadatos NO sensibles para UI
    tokens?: number;
    latenciaMs?: number;
    modeloUsado?: string;
  };
  createdAt: string;
}

// --- Contexto de conversación (pasado al LLM) ---
// Este objeto existe en memoria del ai-engine y NUNCA se persiste en claro

export interface ContextoConversacion {
  sesionId: string;
  empresaId: string;
  perfil: string;
  historialMensajes: Array<{
    rol: RolMensajeChatbot;
    contenido: string;               // en claro dentro del proceso, cifrado al persistir
  }>;
  evaluacionParcial?: Partial<EvaluacionGravedad>;
  faseActual: "escucha" | "evaluacion" | "derivacion";
}

// --- Sesión del chatbot ---

export interface SesionChatbot {
  id: string;
  empresaId: string;
  usuarioId?: string;               // null si sesión anónima
  estado: EstadoSesionChatbot;
  evaluacion?: EvaluacionGravedad;
  derivacion?: DerivacionAsistente;
  numMensajes: number;
  createdAt: string;
  updatedAt: string;
  expiraAt: string;                 // retención corta por diseño
}

// --- Requests ---

export interface CrearSesionChatbotRequest {
  anonima?: boolean;
}

export interface EnviarMensajeRequest {
  contenidoCifrado: string;         // cifrado en cliente antes de enviar
}

// Respuesta de streaming (Server-Sent Events)
export interface MensajeStreamChunk {
  tipo: "token" | "fin" | "error" | "evaluacion";
  contenido?: string;               // token de texto en streaming
  evaluacion?: EvaluacionGravedad;  // solo cuando tipo === "evaluacion"
  error?: string;
}
