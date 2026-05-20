// ============================================================
// SafeWork AI — Tipos del Audit Log inmutable
// El audit log registra CADA acción de backoffice.
// Es inmutable: los registros no se actualizan ni eliminan.
// ============================================================

// Acciones auditables (backoffice — NO flujos anónimos de trabajador)
export type AccionAudit =
  // Autenticación
  | "auth.login.exito"
  | "auth.login.fallo"
  | "auth.logout"
  | "auth.mfa.enrolado"
  | "auth.password.reset"
  // Denuncias (acceso de personal autorizado)
  | "denuncia.ver"
  | "denuncia.descargar_evidencia"
  | "denuncia.asignar"
  | "denuncia.estado.cambiar"
  | "denuncia.mensaje.enviar"
  // Expedientes
  | "expediente.crear"
  | "expediente.ver"
  | "expediente.evento.registrar"
  | "expediente.firmar"
  | "expediente.exportar"
  | "expediente.estado.cambiar"
  // Usuarios
  | "usuario.crear"
  | "usuario.editar"
  | "usuario.desactivar"
  | "usuario.rol.cambiar"
  // Configuración
  | "empresa.configurar"
  | "persona_designada.crear"
  | "persona_designada.editar"
  // Reporting
  | "reporte.generar"
  | "reporte.exportar"
  // Auditoría
  | "audit_log.exportar";

// Recurso sobre el que actúa la acción
export type RecursoAudit =
  | "denuncia"
  | "expediente"
  | "usuario"
  | "empresa"
  | "reporte"
  | "audit_log"
  | "sesion";

export interface RegistroAuditoria {
  id: string;
  empresaId: string;
  usuarioId: string;           // quién realizó la acción (nunca anónimo en backoffice)
  usuarioEmail: string;        // snapshot en el momento — el email puede cambiar después
  accion: AccionAudit;
  recurso: RecursoAudit;
  recursoId?: string;          // ID del recurso afectado
  ipHashSha256?: string;       // hash SHA-256 de la IP del operador interno (no del trabajador)
  userAgent?: string;
  resultado: "exito" | "fallo" | "denegado";
  detalle?: string;            // información adicional no identificativa
  createdAt: string;           // inmutable
}

// Para listado en panel de administración
export type RegistroAuditoriaResumen = Pick<
  RegistroAuditoria,
  "id" | "usuarioEmail" | "accion" | "recurso" | "recursoId" | "resultado" | "createdAt"
>;

// Filtros para consulta del audit log
export interface FiltrosAuditLog {
  usuarioId?: string;
  accion?: AccionAudit;
  recurso?: RecursoAudit;
  resultado?: "exito" | "fallo" | "denegado";
  desde?: string;
  hasta?: string;
}
