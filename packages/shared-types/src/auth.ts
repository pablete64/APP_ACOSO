// ============================================================
// SafeWork AI — Tipos de autenticación, usuarios y empresas
// ============================================================

// --- Enums de perfil ---

export type PerfilUsuario =
  | "trabajador"
  | "responsable_igualdad"
  | "rrhh_legal"
  | "direccion"
  | "inspector";

export type EstadoUsuario = "activo" | "inactivo" | "bloqueado" | "pendiente_verificacion";

export type Plan = "free" | "pyme" | "enterprise";

// --- Permisos granulares ---

export type Permiso =
  // Denuncias
  | "denuncia:crear"
  | "denuncia:leer_propia"
  | "denuncia:leer_todas"
  | "denuncia:asignar"
  | "denuncia:evidencia:subir"
  | "denuncia:evidencia:descargar"
  // Expedientes
  | "expediente:crear"
  | "expediente:leer"
  | "expediente:editar"
  | "expediente:firmar"
  | "expediente:exportar"
  // Mensajería
  | "mensaje:enviar"
  | "mensaje:leer"
  // Citas
  | "cita:crear"
  | "cita:gestionar"
  // Formación
  | "formacion:acceder"
  | "formacion:certificado:descargar"
  // Clima
  | "clima:responder"
  | "clima:ver_resultados_agregados"
  | "clima:configurar"
  // Reporting
  | "reporte:ejecutivo"
  | "reporte:cumplimiento"
  | "reporte:plan_igualdad"
  // Administración
  | "empresa:configurar"
  | "usuarios:gestionar"
  | "audit_log:leer";

// Permisos por perfil
export const PERMISOS_POR_PERFIL: Record<PerfilUsuario, Permiso[]> = {
  trabajador: [
    "denuncia:crear",
    "denuncia:leer_propia",
    "denuncia:evidencia:subir",
    "mensaje:enviar",
    "mensaje:leer",
    "cita:crear",
    "formacion:acceder",
    "formacion:certificado:descargar",
    "clima:responder",
  ],
  responsable_igualdad: [
    "denuncia:leer_todas",
    "denuncia:asignar",
    "denuncia:evidencia:descargar",
    "expediente:crear",
    "expediente:leer",
    "expediente:editar",
    "expediente:firmar",
    "expediente:exportar",
    "mensaje:enviar",
    "mensaje:leer",
    "cita:gestionar",
    "formacion:acceder",
    "clima:ver_resultados_agregados",
    "reporte:cumplimiento",
  ],
  rrhh_legal: [
    "denuncia:leer_todas",
    "denuncia:asignar",
    "denuncia:evidencia:descargar",
    "expediente:crear",
    "expediente:leer",
    "expediente:editar",
    "expediente:firmar",
    "expediente:exportar",
    "mensaje:enviar",
    "mensaje:leer",
    "formacion:acceder",
    "clima:ver_resultados_agregados",
    "reporte:cumplimiento",
    "reporte:plan_igualdad",
    "audit_log:leer",
  ],
  direccion: [
    "reporte:ejecutivo",
    "reporte:cumplimiento",
    "reporte:plan_igualdad",
    "clima:ver_resultados_agregados",
    "formacion:acceder",
  ],
  inspector: [
    "reporte:cumplimiento",
    "reporte:plan_igualdad",
  ],
};

// --- Entidad Empresa ---

export interface Empresa {
  id: string;
  nombre: string;
  cif: string;
  schemaName: string;
  plan: Plan;
  activa: boolean;
  numEmpleados?: number;
  sector?: string;
  dpoEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Entidad Usuario ---

export interface Usuario {
  id: string;
  empresaId: string;
  email: string;
  perfil: PerfilUsuario;
  nombre?: string;
  estado: EstadoUsuario;
  mfaActivo: boolean;
  ultimoAcceso?: string;
  createdAt: string;
}

// Datos del usuario en sesión activa (JWT payload)
export interface SesionUsuario {
  sub: string;           // userId
  empresaId: string;
  perfil: PerfilUsuario;
  permisos: Permiso[];
  schemaName: string;    // tenant schema
  iat: number;
  exp: number;
}

// --- Auth requests / responses ---

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: Omit<Usuario, "createdAt">;
  requiereMfa: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
