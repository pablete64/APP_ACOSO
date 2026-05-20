# Flujo de gestión de expedientes — M5

## Diagrama de secuencia

```mermaid
sequenceDiagram
  actor IP as Instructora/Instructor
  participant Next as apps/web (Next.js)
  participant API as services/api (FastAPI)
  participant CASE as services/case-management (Spring Boot)
  participant TSA as Servidor TSA externo
  participant PG as PostgreSQL

  Note over IP,PG: FASE 1 — Apertura de expediente

  IP->>Next: Abre expediente desde denuncia aceptada
  Next->>API: POST /api/v1/expedientes { denunciaId, instructorId }
  API->>API: Verifica permiso EXPEDIENTE_CREAR (perfil hr/equality)
  API->>CASE: POST /case/v1/expedientes { denunciaId, tenantSchema }
  CASE->>PG: INSERT INTO {schema}.expedientes (estado=ABIERTO, fechaApertura, ...)
  CASE-->>API: { expedienteId, referencia }
  API-->>Next: { expedienteId, referencia, plazosLegales[] }

  Note over IP,PG: FASE 2 — Añadir evento con firma digital

  IP->>Next: Crea evento (actuación, notificación, resolución, ...)
  Next->>API: POST /api/v1/expedientes/{id}/eventos { tipo, descripcion, documentos[] }
  API->>CASE: POST /case/v1/expedientes/{id}/eventos
  CASE->>CASE: Genera hash SHA-256 del contenido del evento
  CASE->>CASE: Firma digital (clave privada del sistema → PKCS#12)
  CASE->>TSA: POST TSA request (RFC 3161) con hash del evento
  TSA-->>CASE: Timestamp Token (sellado de tiempo verificable)
  CASE->>PG: INSERT INTO {schema}.eventos_expediente<br/>(tipo, descripcion, hash_sha256, firma_digital, sell_tiempo_tsa, firmado_por)
  CASE-->>API: { eventoId, sellTiempoTsa, firmaDigital }
  API-->>Next: { evento creado con timestamp TSA }

  Note over IP,PG: FASE 3 — Consulta de plazos legales

  Next->>API: GET /api/v1/expedientes/{id}/plazos
  API->>CASE: GET /case/v1/expedientes/{id}/plazos
  CASE->>PG: SELECT eventos, fechaApertura FROM expediente
  CASE->>CASE: Calcula diasRestantes vs plazos Ley 2/2023<br/>(investigación: 3m · resolución: 10d · notificación: 7d)
  CASE-->>API: PlazoLegal[] con alertas si diasRestantes < 5
  API-->>Next: { plazos con alertas visuales }

  Note over IP,PG: FASE 4 — Exportación para auditoría / juzgado

  IP->>Next: Solicita exportación del expediente completo
  Next->>API: POST /api/v1/expedientes/{id}/exportar
  API->>CASE: POST /case/v1/expedientes/{id}/exportar
  CASE->>PG: SELECT * FROM expediente + eventos + documentos
  CASE->>CASE: Genera PDF firmado + JSON canónico
  CASE->>CASE: SHA-256 del paquete completo (verificacionIntegridad)
  CASE-->>API: ExportacionExpediente { url_descarga_temporal, hash, firmaExportacion }
  API-->>Next: { url de descarga (presigned, 1h TTL) }
```

## Comunicación API ↔ Case-Management

```mermaid
graph LR
  subgraph api["services/api (FastAPI :8000)"]
    R["/api/v1/expedientes/*"]
  end
  subgraph case["services/case-management (Spring Boot :8080)"]
    CR["/case/v1/expedientes/*"]
    SIG["Firma Digital<br/>(BouncyCastle)"]
    TSA_C["TSA Client<br/>(RFC 3161)"]
  end
  subgraph ext["Externos"]
    TSA_S["TSA Server<br/>(Firmaprofesional / FreeTSA)"]
  end

  R -->|"HTTP interna (red Docker)"| CR
  CR --> SIG
  CR --> TSA_C
  TSA_C -->|"HTTPS"| TSA_S
```

La comunicación entre `api` y `case-management` es **interna** (red Docker, no expuesta).
Solo `Nginx` expone puertos al exterior.

## Plazos legales implementados (Ley 2/2023)

| Plazo | Duración | Artículo | Alerta en |
|---|---|---|---|
| Acuse de recibo al denunciante | 7 días hábiles | Art. 19 | 5 días |
| Investigación | 3 meses (extensible) | Art. 20 | 15 días antes |
| Resolución y comunicación | 10 días hábiles desde resolución | Art. 22 | 5 días |
| Conservación del expediente | 10 años | Art. 24 | — |

## Tipos de evento del expediente

| Tipo | Requiere firma | Requiere TSA |
|---|---|---|
| `APERTURA` | Sí | Sí |
| `NOTIFICACION_DENUNCIANTE` | Sí | Sí |
| `ACTUACION_INVESTIGADORA` | Sí | Sí |
| `TESTIGO_ENTREVISTADO` | Sí | Sí |
| `PRUEBA_INCORPORADA` | Sí | Sí |
| `CONCLUSION_INVESTIGACION` | Sí | Sí |
| `RESOLUCION` | Sí | Sí |
| `MEDIDA_CAUTELAR` | Sí | Sí |
| `ARCHIVO` | Sí | Sí |
| `COMENTARIO_INTERNO` | No | No |
