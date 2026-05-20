// ============================================================
// SafeWork AI — Barrel de tipos compartidos
// Importar desde "@safework/shared-types"
// ============================================================

// Autenticación, usuarios y empresas
export * from "./auth.ts";

// M1 — Canal seguro de denuncia
export * from "./denuncia.ts";

// M2 — Asistente IA empático
export * from "./asistente.ts";

// M3 — Formación y recursos
export * from "./formacion.ts";

// M4 — Línea de contacto con personas designadas
export * from "./contacto.ts";

// M5 — Gestión de expedientes (Java case-management)
export * from "./expediente.ts";

// M6/M7 — Clima laboral y reporting/dashboard
export * from "./clima.ts";

// Audit log inmutable
export * from "./audit.ts";

// Tipos genéricos de la API REST
export * from "./api.ts";

// Google Analytics 4 — eventos tipados y anonimizados
export * from "./analytics.ts";

// Schemas Zod (validación cliente/servidor compartida)
export * from "./schemas/auth.schema.ts";
export * from "./schemas/denuncia.schema.ts";
export * from "./schemas/contacto.schema.ts";
export * from "./schemas/clima.schema.ts";
