// ============================================================
// SafeWork AI — Tipos del M4: Línea de contacto con personas designadas
// ============================================================

// --- Enums ---

export type ModalidadCita = "presencial" | "telefonica" | "videollamada";

export type EstadoCita =
  | "solicitada"
  | "confirmada"
  | "cancelada_usuario"
  | "cancelada_designada"
  | "celebrada"
  | "no_presentado";

export type IdiomaContacto = "es" | "en" | "ca" | "eu" | "gl";

// --- Persona designada ---

export interface PersonaDesignada {
  id: string;
  usuarioId: string;
  empresaId: string;
  nombre: string;
  rol: string;                        // "Responsable de Igualdad", "Comisión de Igualdad", etc.
  email?: string;                     // solo visible para ella misma / RRHH
  telefonoExtension?: string;
  idiomas: IdiomaContacto[];
  disponibilidad: DisponibilidadHoraria[];
  activa: boolean;
  fotoPerfil?: string;
}

export interface DisponibilidadHoraria {
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  horaInicio: string;                     // "09:00"
  horaFin: string;                        // "17:00"
}

// --- Citas ---

export interface Cita {
  id: string;
  solicitanteId: string;
  personaDesignadaId: string;
  modalidad: ModalidadCita;
  estado: EstadoCita;
  fechaPropuesta: string;
  fechaConfirmada?: string;
  urlVideollamada?: string;           // URL efímera generada para la llamada
  notas?: string;                     // notas de preparación (cifradas)
  motivoCancelacion?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Mensajería interna cifrada ---

export type AutorMensajeInterno = "solicitante" | "designada";

export interface MensajeInterno {
  id: string;
  conversacionId: string;
  autor: AutorMensajeInterno;
  contenidoCifrado: string;           // E2E — ni el servidor lee el contenido
  leido: boolean;
  createdAt: string;
}

export interface ConversacionInterna {
  id: string;
  solicitanteId: string;
  personaDesignadaId: string;
  mensajes?: MensajeInterno[];
  ultimoMensajeAt?: string;
  numNoLeidos: number;
  createdAt: string;
}

// --- Asesoría externa ---

export interface AsesoriaExterna {
  id: string;
  nombre: string;
  tipo: "juridica" | "psicologica" | "sindical";
  descripcion: string;
  url?: string;
  telefono?: string;
  disponible: boolean;
}

// --- Requests ---

export interface SolicitarCitaRequest {
  personaDesignadaId: string;
  modalidad: ModalidadCita;
  fechaPropuesta: string;
  notas?: string;
}

export interface EnviarMensajeInternoRequest {
  conversacionId?: string;            // si es null, se crea nueva conversación
  personaDesignadaId?: string;        // requerido si conversacionId es null
  contenidoCifrado: string;
}
