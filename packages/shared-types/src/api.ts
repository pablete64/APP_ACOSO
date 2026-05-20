// ============================================================
// SafeWork AI — Tipos genéricos de la API REST
// ============================================================

// --- Respuesta estándar ---

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

// --- Error estructurado ---

// Códigos de error propios de SafeWork AI
export type CodigoError =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_MFA_REQUIRED"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTHZ_FORBIDDEN"                   // 403 — permiso insuficiente
  | "AUTHZ_WRONG_TENANT"               // intento de cross-tenant
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "CRYPTO_ERROR"                      // fallo de cifrado/descifrado
  | "UPLOAD_TOO_LARGE"
  | "UPLOAD_INVALID_TYPE"
  | "RATE_LIMIT_EXCEEDED"
  | "AI_ENGINE_UNAVAILABLE"
  | "CASE_MGMT_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: CodigoError;
  message: string;                      // mensaje legible (internacionalizable)
  details?: Record<string, string[]>;   // errores de validación campo a campo
  traceId?: string;                     // para correlacionar con logs de Sentry
}

// --- Paginación ---

export interface PaginationParams {
  page?: number;      // 1-indexed
  pageSize?: number;  // default 20, max 100
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// --- Filtros comunes ---

export interface FiltrosFecha {
  desde?: string;  // ISO 8601
  hasta?: string;  // ISO 8601
}

// --- Subida de archivos ---

export interface UploadResponse {
  uploadId: string;
  s3Key: string;           // key en el bucket (opaco para el cliente)
  sha256Hash: string;      // hash del archivo ANTES de cifrar (para integridad)
  expiresAt: string;       // la URL de subida es temporal
}

// --- Healthcheck ---

export interface HealthcheckResponse {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
  timestamp: string;
  dependencias?: Record<string, "ok" | "degraded" | "down">;
}
