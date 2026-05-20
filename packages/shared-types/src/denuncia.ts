// ============================================================
// SafeWork AI — Tipos del M1: Canal seguro de denuncia
// ============================================================

// --- Enums ---

export type TipoAcoso =
  | "laboral"           // acoso moral/mobbing
  | "sexual"            // acoso sexual
  | "discriminacion"    // por razón de sexo, raza, edad, etc.
  | "otro";

export type ModalidadDenuncia = "anonima" | "identificada";

export type EstadoDenuncia =
  | "recibida"          // recién enviada, sin asignar
  | "en_instruccion"    // expediente abierto, en proceso
  | "resuelta"          // con resolución formal
  | "archivada";        // archivada sin expediente (desistimiento, improcedente)

export type GravedadIA =
  | "baja"              // indicadores leves o aislados
  | "media"             // varios indicadores o reiteración
  | "alta"              // impacto severo o relación jerárquica
  | "critica";          // riesgo para la integridad de la persona

// --- Evidencias ---

export interface Evidencia {
  id: string;
  denunciaId: string;
  nombreArchivo: string;         // nombre original (no la ruta real)
  tipoMime: string;
  tamanoBytes: number;
  sha256Hash: string;            // integridad: hash del archivo original ANTES de cifrar
  uploadedAt: string;
}

// URL pre-firmada temporal para descarga de evidencia cifrada
export interface EvidenciaDescargaUrl {
  evidenciaId: string;
  url: string;
  expiresAt: string;
}

// --- Mensajes bidireccionales (anónimos, por tracking code) ---

export type AutorMensaje = "denunciante" | "empresa";

export interface MensajeDenuncia {
  id: string;
  denunciaId: string;
  autor: AutorMensaje;
  contenidoCifrado: string;      // cifrado E2E, no legible en servidor
  createdAt: string;
}

// --- Entidad principal ---

export interface Denuncia {
  id: string;
  codigoSeguimiento: string;     // código único que se da al denunciante
  tipo: TipoAcoso;
  modalidad: ModalidadDenuncia;
  estado: EstadoDenuncia;
  gravedadIa?: GravedadIA;
  // El contenido real va cifrado, NUNCA en claro en este tipo
  evidencias?: Evidencia[];
  mensajes?: MensajeDenuncia[];
  usuarioId?: string;            // solo si modalidad === "identificada"
  expedienteId?: string;
  createdAt: string;
  updatedAt: string;
}

// Vista reducida para listados (sin contenido cifrado)
export type DenunciaResumen = Pick<
  Denuncia,
  "id" | "codigoSeguimiento" | "tipo" | "modalidad" | "estado" | "gravedadIa" | "createdAt" | "updatedAt"
>;

// --- Requests ---

// El payload de la denuncia llega cifrado desde el cliente
export interface CrearDenunciaRequest {
  tipo: TipoAcoso;
  modalidad: ModalidadDenuncia;
  payloadCifrado: string;        // texto cifrado con AES-256-GCM en cliente
  evidenciaHashes: string[];     // SHA-256 de cada archivo (calculados antes de cifrar)
}

export interface EnviarMensajeDenunciaRequest {
  codigoSeguimiento: string;
  contenidoCifrado: string;
}

// --- Response de seguimiento (pública, sin auth) ---

export interface SeguimientoResponse {
  codigoSeguimiento: string;
  estado: EstadoDenuncia;
  createdAt: string;
  updatedAt: string;
  mensajes: Array<{
    autor: AutorMensaje;
    contenidoCifrado: string;
    createdAt: string;
  }>;
}
