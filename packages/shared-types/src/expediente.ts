// ============================================================
// SafeWork AI — Tipos del M5: Gestión de expedientes (Java)
// ============================================================

// --- Enums ---

export type EstadoExpediente =
  | "abierto"
  | "en_instruccion"
  | "pendiente_resolucion"
  | "resuelto"
  | "archivado";

export type TipoEventoExpediente =
  | "apertura"                   // expediente abierto
  | "asignacion"                 // asignado a instructor
  | "entrevista_denunciante"
  | "entrevista_denunciado"
  | "entrevista_testigo"
  | "acta"                       // acta de instrucción
  | "documento_aportado"
  | "resolucion"                 // resolución final
  | "notificacion"               // comunicación a las partes
  | "archivo"
  | "firma_digital"
  | "sellado_tiempo";

export type EstadoPlazo = "pendiente" | "proximo" | "vencido" | "cumplido";

// --- Eventos (log inmutable del expediente) ---

export interface EventoExpediente {
  id: string;
  expedienteId: string;
  tipo: TipoEventoExpediente;
  descripcion: string;
  autorId: string;
  autorNombre: string;           // snapshot del nombre en el momento del evento
  sha256Hash?: string;           // hash del contenido del evento (integridad)
  sellTiempoTsa?: string;        // timestamp de la TSA (RFC 3161)
  firmaDigital?: string;
  documentoUrl?: string;
  createdAt: string;             // inmutable — nunca se actualiza
}

// --- Plazos legales ---

export interface PlazoLegal {
  id: string;
  expedienteId: string;
  descripcion: string;
  fechaLimite: string;
  estado: EstadoPlazo;
  diasRestantes: number;         // calculado en runtime
  baseNormativa: string;         // p.ej. "Ley 2/2023 art. 8"
}

// --- Entidad principal ---

export interface Expediente {
  id: string;
  numero: string;                // número único legible (p.ej. EXP-2026-001)
  denunciaId?: string;
  estado: EstadoExpediente;
  asignadoA?: string;            // userId del instructor
  asignadoANombre?: string;
  fechaApertura: string;
  fechaCierre?: string;
  resolucion?: string;           // texto de la resolución (cifrado si contiene datos personales)
  firmaDigital?: string;
  sellTiempoTsa?: string;
  eventos?: EventoExpediente[];
  plazos?: PlazoLegal[];
  createdAt: string;
  updatedAt: string;
}

export type ExpedienteResumen = Pick<
  Expediente,
  "id" | "numero" | "estado" | "asignadoANombre" | "fechaApertura" | "fechaCierre" | "createdAt" | "updatedAt"
>;

// --- Requests ---

export interface CrearExpedienteRequest {
  denunciaId: string;
  asignadoA?: string;
}

export interface RegistrarEventoRequest {
  tipo: TipoEventoExpediente;
  descripcion: string;
  documentoBase64?: string;      // documento a adjuntar (se sella en servidor)
}

export interface CambiarEstadoExpedienteRequest {
  estado: EstadoExpediente;
  resolucion?: string;
}

// --- Exportación legal ---

export interface ExportacionExpediente {
  expediente: Expediente;
  eventos: EventoExpediente[];
  plazos: PlazoLegal[];
  verificacionIntegridad: {
    valida: boolean;
    hashesVerificados: number;
    hashesCorruptos: number;
  };
  generadoAt: string;
  generadoPor: string;
}
