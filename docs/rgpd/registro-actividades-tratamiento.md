# Registro de Actividades de Tratamiento (RAT)

**Responsable del tratamiento**: REKER Tech Solutions S.L.  
**DPO**: Por designar — dpo@safework.es  
**Base legal**: Art. 30 RGPD; art. 31 LOPDGDD  
**Revisión**: Mayo 2025  
**Clasificación**: Interno — Confidencial

---

## T-01 — Gestión de cuentas de usuario (clientes empresa)

| Campo | Valor |
|---|---|
| **Finalidad** | Creación y mantenimiento de cuentas de usuario en la plataforma SafeWork AI |
| **Responsable** | REKER Tech Solutions S.L. |
| **Encargados** | AWS EMEA SARL (infraestructura cloud, Frankfurt) |
| **Categorías de interesados** | Empleados y administradores de empresas clientes |
| **Categorías de datos** | Nombre, correo electrónico, rol en la empresa, empresa asociada, fecha de registro, última conexión |
| **Datos especiales** | No |
| **Base jurídica** | Ejecución de contrato (art. 6.1.b RGPD) |
| **Plazo de conservación** | Duración del contrato + 5 años (prescripción mercantil) |
| **Transferencias internacionales** | No (cloud Frankfurt, UE) |
| **Medidas de seguridad** | Cifrado en tránsito (TLS 1.3), cifrado en reposo (AES-256), acceso por roles (RBAC), 2FA disponible |

---

## T-02 — Canal de denuncias anónimas

| Campo | Valor |
|---|---|
| **Finalidad** | Recepción, gestión e investigación de comunicaciones de infracciones (Ley 2/2023) |
| **Responsable** | Empresa cliente (responsable del tratamiento); REKER Tech Solutions S.L. (encargado) |
| **Encargados** | AWS EMEA SARL (almacenamiento cifrado) |
| **Categorías de interesados** | Informantes (potencialmente anónimos); personas investigadas; testigos |
| **Categorías de datos** | Relato cifrado (ciphertext + IV, sin acceso por REKER); código de seguimiento anónimo; metadatos de la denuncia (fecha, categoría, estado) |
| **Datos especiales** | Potencialmente (infracciones penales — art. 10 RGPD) |
| **Base jurídica** | Obligación legal (Ley 2/2023 art. 8; art. 6.1.c RGPD) |
| **Plazo de conservación** | 10 años desde la resolución del expediente (art. 24 Ley 2/2023) |
| **Transferencias internacionales** | No |
| **Medidas de seguridad** | Cifrado extremo a extremo AES-256-GCM; clave exclusiva del denunciante; sin registro de IP del informante; sello de tiempo TSA para integridad |

---

## T-03 — Gestión de expedientes de investigación

| Campo | Valor |
|---|---|
| **Finalidad** | Tramitación del procedimiento disciplinario / investigador derivado de una denuncia |
| **Responsable** | Empresa cliente |
| **Encargados** | REKER Tech Solutions S.L. (plataforma); AWS EMEA SARL (infraestructura) |
| **Categorías de interesados** | Denunciado/a; investigadores; miembros de la comisión instructora; testigos |
| **Categorías de datos** | Identidad de las partes, documentación aportada, actas de reuniones, resolución, medidas adoptadas |
| **Datos especiales** | Potencialmente (salud, vida sindical, infracciones penales) |
| **Base jurídica** | Obligación legal + interés legítimo del empleador (art. 6.1.b/c/f RGPD) |
| **Plazo de conservación** | 10 años desde resolución |
| **Transferencias internacionales** | No |
| **Medidas de seguridad** | Control de acceso granular por rol; exportación con hash SHA-256; logs de auditoría inmutables |

---

## T-04 — Encuestas de clima laboral (M7)

| Campo | Valor |
|---|---|
| **Finalidad** | Medición del clima organizacional mediante encuestas anónimas con metodología FPSICO/INSST |
| **Responsable** | Empresa cliente |
| **Encargados** | REKER Tech Solutions S.L.; AWS EMEA SARL |
| **Categorías de interesados** | Trabajadores de la empresa (anónimos) |
| **Categorías de datos** | Respuestas numéricas a 8 dimensiones FPSICO; departamento (opcional, si k≥5); sin identificación personal |
| **Datos especiales** | No (datos completamente anonimizados en origen) |
| **Base jurídica** | Interés legítimo (art. 6.1.f RGPD); consentimiento implícito en participación voluntaria |
| **Plazo de conservación** | Hasta revocación por el responsable del tratamiento + 2 años |
| **Transferencias internacionales** | No |
| **Medidas de seguridad** | K-anonimato mínimo de 5; sin registro de user_id ni IP en respuestas; resultados solo en forma agregada |

---

## T-05 — Formación y certificaciones (M3)

| Campo | Valor |
|---|---|
| **Finalidad** | Gestión de la formación obligatoria en prevención del acoso y emisión de certificados |
| **Responsable** | Empresa cliente |
| **Encargados** | REKER Tech Solutions S.L.; AWS EMEA SARL |
| **Categorías de interesados** | Trabajadores de la empresa |
| **Categorías de datos** | Progreso por módulo, puntuaciones de test, fecha de obtención del certificado, estado de completitud |
| **Datos especiales** | No |
| **Base jurídica** | Obligación legal (ET art. 19; Ley 2/2023); ejecución de contrato |
| **Plazo de conservación** | Vigencia del contrato + 5 años (acreditación legal de formación impartida) |
| **Transferencias internacionales** | No |
| **Medidas de seguridad** | Acceso solo al propio trabajador y a RRHH con permiso explícito; certificados con hash verificable |

---

## T-06 — Mediación y pares de apoyo (M8)

| Campo | Valor |
|---|---|
| **Finalidad** | Gestión de procesos de mediación voluntaria y registro de pares de apoyo acreditados |
| **Responsable** | Empresa cliente |
| **Encargados** | REKER Tech Solutions S.L.; AWS EMEA SARL |
| **Categorías de interesados** | Partes en mediación (solicitante y otra parte); pares de apoyo registrados |
| **Categorías de datos** | Consentimiento de ambas partes (booleano); motivo cifrado E2E; estado del proceso; identidad visible del par de apoyo (voluntaria) |
| **Datos especiales** | Potencialmente (represalias relacionadas con vida sindical o salud) — cifrado E2E |
| **Base jurídica** | Consentimiento explícito (art. 6.1.a RGPD; Directiva 2019/1937) |
| **Plazo de conservación** | 5 años desde la resolución |
| **Transferencias internacionales** | No |
| **Medidas de seguridad** | Consentimiento de ambas partes verificado antes de crear expediente; represalias solo en ciphertext + IV |

---

## T-07 — Logs del sistema y seguridad

| Campo | Valor |
|---|---|
| **Finalidad** | Detección de incidentes de seguridad, diagnóstico de errores, trazabilidad de operaciones |
| **Responsable** | REKER Tech Solutions S.L. |
| **Encargados** | AWS EMEA SARL |
| **Categorías de interesados** | Usuarios de la plataforma (trabajadores, gestores, administradores) |
| **Categorías de datos** | Trace ID, timestamp, endpoint, código de respuesta HTTP, duración de respuesta; **sin** contenido de datos personales (SCRUB_KEYS activo) |
| **Datos especiales** | No (scrubbing activo en JsonFormatter) |
| **Base jurídica** | Interés legítimo — seguridad del sistema de información (art. 6.1.f RGPD) |
| **Plazo de conservación** | 30 días (Prometheus TSDB); logs JSON 90 días → Glacier |
| **Transferencias internacionales** | No |
| **Medidas de seguridad** | Scrubbing automático de claves sensibles; logs estructurados sin PII; acceso restringido al equipo de operaciones |

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | Mayo 2025 | Versión inicial — 7 tratamientos |
