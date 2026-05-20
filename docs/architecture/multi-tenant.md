# Aislamiento multi-tenant — SafeWork AI

## Estrategia: schema por empresa en PostgreSQL

Cada empresa cliente tiene su propio **schema PostgreSQL** con prefijo `empresa_{id}`.
Todos los datos operativos (denuncias, expedientes, usuarios, etc.) viven dentro de ese schema.
La tabla global `public.empresas` y `public.usuarios_globales` solo contienen metadatos de tenant y credenciales de login.

```mermaid
graph TB
  subgraph public["Schema: public (compartido)"]
    E["empresas<br/>(id, nombre, plan, schema_nombre)"]
    UG["usuarios_globales<br/>(id, empresa_id, email, password_hash, salt)"]
    RT["refresh_tokens"]
  end

  subgraph e1["Schema: empresa_a1b2c3d4 (Empresa ACME)"]
    U1["usuarios"]
    D1["denuncias"]
    EV1["evidencias"]
    EX1["expedientes"]
    EVI1["eventos_expediente"]
    F1["formacion_progreso"]
    C1["clima_respuestas"]
    AU1["audit_log"]
  end

  subgraph e2["Schema: empresa_e5f6g7h8 (Empresa Beta S.L.)"]
    U2["usuarios"]
    D2["denuncias"]
    EV2["evidencias"]
    EX2["expedientes"]
    EVI2["eventos_expediente"]
    F2["formacion_progreso"]
    C2["clima_respuestas"]
    AU2["audit_log"]
  end

  E -->|"schema_nombre"| e1
  E -->|"schema_nombre"| e2
```

## Función de creación de schema

`crear_schema_empresa(p_empresa_id UUID)` — función PL/pgSQL en `database/schemas/001_init.sql`:

1. Genera `schema_nombre = 'empresa_' || replace(p_empresa_id::text, '-', '')[:8]`
2. Ejecuta `CREATE SCHEMA IF NOT EXISTS {schema_nombre}`
3. Crea todas las tablas dentro del schema: usuarios, denuncias, evidencias, expedientes, eventos_expediente, mensajes_denuncia, formacion_*, clima_*, audit_log
4. Crea índices por (empresa_id, estado, created_at)
5. Configura RLS policies (Row Level Security) adicional como defensa en profundidad

## Row Level Security (defensa en profundidad)

Aunque el código siempre usa `SET search_path = empresa_{id}` antes de cada query, las tablas también tienen RLS activado como segunda capa:

```sql
-- Ejemplo para tabla denuncias
ALTER TABLE denuncias ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON denuncias
  USING (current_setting('app.current_schema') = current_schema());
```

Esto impide que un bug de aplicación permita leer datos cross-tenant incluso si se olvida el `SET search_path`.

## Ciclo de vida de un tenant

```mermaid
stateDiagram-v2
  [*] --> Registro: Empresa se registra
  Registro --> Activo: crear_schema_empresa() + primer pago
  Activo --> Suspendido: impago / solicitud
  Suspendido --> Activo: reactivación
  Suspendido --> Eliminado: 30 días sin pago
  Eliminado --> [*]: Schema borrado + backups cifrados 10 años (Ley 2/2023 art. 24)
```

## Cómo se resuelve el schema en cada request

```mermaid
sequenceDiagram
  participant Next as apps/web
  participant API as services/api
  participant PG as PostgreSQL

  Next->>API: Request con JWT { sub: userId, tenantSchema: "empresa_a1b2c3d4" }
  API->>API: Verifica JWT signature + exp
  API->>API: Extrae tenantSchema del JWT payload
  API->>PG: SET search_path = empresa_a1b2c3d4, public
  API->>PG: SELECT * FROM denuncias WHERE id = $1
  Note right of PG: La query opera SOLO dentro del schema del tenant.<br/>Imposible acceder a datos de otra empresa.
  PG-->>API: Resultado aislado
  API-->>Next: Response
```

## Planes y límites por tenant

| Plan | Usuarios máx. | Almacenamiento | Módulos |
|---|---|---|---|
| `starter` | 50 | 5 GB | M1, M2, M3 |
| `professional` | 500 | 50 GB | M1–M7 |
| `enterprise` | Sin límite | 500 GB | M1–M8 + SLA + integración HR |

Los límites se comprueban en middleware FastAPI antes de permitir escrituras.

## Aislamiento de datos de clima laboral (k-anonimato)

Las encuestas de clima (`clima_respuestas`) **no almacenan** `usuario_id`.
Se guardan solo: `empresa_id`, `encuesta_id`, `respuestas` (JSON), `created_at` (solo fecha, no hora).
Se requiere mínimo **k=5** respuestas por segmento para mostrar resultados (protección estadística).
