-- ============================================================
-- SafeWork AI — Schema inicial completo v2
-- Multi-tenant: cada empresa → schema empresa_{cif_normalizado}
-- Ley 2/2023 · RGPD · LOPDGDD
-- ============================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================
-- SCHEMA PUBLIC — Metadatos globales (SafeWork AI como plataforma)
-- ============================================================

-- Planes de suscripción
CREATE TABLE IF NOT EXISTS public.planes (
    id              VARCHAR(50) PRIMARY KEY,         -- 'starter', 'professional', 'enterprise'
    nombre          VARCHAR(100) NOT NULL,
    max_usuarios    INTEGER,                          -- NULL = ilimitado
    max_storage_gb  INTEGER NOT NULL DEFAULT 5,
    modulos         TEXT[] NOT NULL DEFAULT '{}',     -- ['m1','m2','m3',...]
    precio_mes_eur  NUMERIC(10,2),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.planes (id, nombre, max_usuarios, max_storage_gb, modulos, precio_mes_eur)
VALUES
    ('starter',      'Starter',      50,   5,   ARRAY['m1','m2','m3'],              99.00),
    ('professional', 'Professional', 500,  50,  ARRAY['m1','m2','m3','m4','m5','m6','m7'], 299.00),
    ('enterprise',   'Enterprise',   NULL, 500, ARRAY['m1','m2','m3','m4','m5','m6','m7','m8'], NULL)
ON CONFLICT (id) DO NOTHING;

-- Empresas (tenants)
CREATE TABLE IF NOT EXISTS public.empresas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cif             VARCHAR(20) UNIQUE NOT NULL,
    razon_social    VARCHAR(255) NOT NULL,
    schema_name     VARCHAR(63) UNIQUE NOT NULL,    -- 'empresa_{cif_normalizado}'
    plan_id         VARCHAR(50) NOT NULL REFERENCES public.planes(id) DEFAULT 'starter',
    dpo_email       VARCHAR(255),                   -- Delegado de Protección de Datos
    num_empleados   INTEGER,
    sector          VARCHAR(100),
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    trial_hasta     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Superadministradores de la plataforma (NO usuarios de empresa)
CREATE TABLE IF NOT EXISTS public.usuarios_globales (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,          -- Argon2id
    nombre          VARCHAR(255),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuarios de empresa (vinculados a una empresa)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,          -- Argon2id
    salt_b64        VARCHAR(255) NOT NULL,          -- PBKDF2 salt para E2E encryption
    wrapped_key_b64 TEXT,                           -- AES-KW de la content key
    perfil          VARCHAR(50) NOT NULL CHECK (perfil IN (
                      'trabajador', 'responsable_igualdad', 'rrhh_legal', 'direccion', 'inspector'
                    )),
    nombre          VARCHAR(255),
    mfa_secret      VARCHAR(255),                   -- TOTP secret (cifrado en BD)
    mfa_activo      BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta TIMESTAMPTZ,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens (sesiones revocables)
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 del token
    expires_at      TIMESTAMPTZ NOT NULL,
    revocado        BOOLEAN NOT NULL DEFAULT FALSE,
    ip_hash         VARCHAR(64),                    -- SHA-256 de la IP
    user_agent_hash VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auditoría global (acciones de superadmin sobre la plataforma)
CREATE TABLE IF NOT EXISTS public.auditoria_global (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        UUID REFERENCES public.usuarios_globales(id),
    accion          VARCHAR(100) NOT NULL,
    empresa_id      UUID REFERENCES public.empresas(id),
    detalle         JSONB,
    ip_hash         VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices globales
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa    ON public.usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email      ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil     ON public.usuarios(empresa_id, perfil);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_exp  ON public.refresh_tokens(expires_at) WHERE revocado = FALSE;
CREATE INDEX IF NOT EXISTS idx_empresas_cif        ON public.empresas(cif);

-- ============================================================
-- FUNCIÓN: crear_schema_empresa(p_empresa_id, p_cif)
-- Crea el schema aislado con TODAS las tablas e índices
-- ============================================================
CREATE OR REPLACE FUNCTION public.crear_schema_empresa(
    p_empresa_id UUID,
    p_cif        VARCHAR
) RETURNS TEXT AS $$
DECLARE
    v_schema VARCHAR;
    v_cif_norm VARCHAR;
BEGIN
    -- Normalizar CIF: mayúsculas, sin guiones ni espacios, máx 10 chars
    v_cif_norm := upper(regexp_replace(p_cif, '[^A-Za-z0-9]', '', 'g'));
    v_schema   := 'empresa_' || lower(v_cif_norm);

    -- Actualizar schema_name en la tabla de empresas
    UPDATE public.empresas SET schema_name = v_schema WHERE id = p_empresa_id;

    -- Crear el schema si no existe
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema);

    -- ── M1 · M5: Denuncias ──────────────────────────────────────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.denuncias (
            id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tracking_code       VARCHAR(10) UNIQUE NOT NULL,
            modalidad           VARCHAR(15) NOT NULL CHECK (modalidad IN ('anonima','identificada')),
            tipo_acoso          VARCHAR(50) NOT NULL,
            estado              VARCHAR(30) NOT NULL DEFAULT 'recibida' CHECK (estado IN (
                                  'recibida','en_revision','en_instruccion','resuelta','archivada','desestimada'
                                )),
            gravedad_ia         VARCHAR(20) CHECK (gravedad_ia IN ('muy_baja','baja','media','alta','muy_alta')),
            evaluacion_ia       JSONB,
            -- E2E: solo se almacena el ciphertext; servidor nunca ve plaintext
            ciphertext_b64      TEXT NOT NULL,
            iv_b64              VARCHAR(32) NOT NULL,
            -- Solo en denuncias identificadas (NULL = anónima)
            denunciante_id      UUID,
            -- Instructor asignado del expediente
            instructor_id       UUID,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema);

    -- Mensajes de seguimiento (comunicación con denunciante por tracking_code)
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.denuncia_mensajes (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            denuncia_id     UUID NOT NULL REFERENCES %I.denuncias(id) ON DELETE CASCADE,
            remitente       VARCHAR(20) NOT NULL CHECK (remitente IN ('denunciante','instructor','sistema')),
            ciphertext_b64  TEXT NOT NULL,
            iv_b64          VARCHAR(32) NOT NULL,
            leido           BOOLEAN NOT NULL DEFAULT FALSE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema, v_schema);

    -- Evidencias adjuntas (almacenadas ya cifradas en object storage)
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.denuncia_evidencias (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            denuncia_id     UUID NOT NULL REFERENCES %I.denuncias(id) ON DELETE CASCADE,
            nombre_archivo  VARCHAR(255) NOT NULL,
            tipo_mime       VARCHAR(100) NOT NULL,
            tamano_bytes    BIGINT NOT NULL,
            sha256_original VARCHAR(64) NOT NULL,    -- hash del archivo ANTES de cifrar
            storage_key     TEXT NOT NULL,           -- ruta en object storage (cifrada en repo)
            iv_b64          VARCHAR(32) NOT NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema, v_schema);

    -- ── M5: Expedientes ─────────────────────────────────────────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.expedientes (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            denuncia_id     UUID REFERENCES %I.denuncias(id),
            referencia      VARCHAR(50) UNIQUE NOT NULL,   -- ej: EXP-2026-001
            estado          VARCHAR(30) NOT NULL DEFAULT 'abierto' CHECK (estado IN (
                              'abierto','en_instruccion','pendiente_resolucion','resuelto','archivado'
                            )),
            instructor_id   UUID NOT NULL,
            fecha_apertura  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            fecha_cierre    TIMESTAMPTZ,
            resolucion      TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema, v_schema);

    -- Eventos inmutables del expediente (firma digital + sello TSA)
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.expediente_eventos (
            id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            expediente_id       UUID NOT NULL REFERENCES %I.expedientes(id),
            tipo                VARCHAR(50) NOT NULL CHECK (tipo IN (
                                  'apertura','notificacion_denunciante','actuacion_investigadora',
                                  'testigo_entrevistado','prueba_incorporada','conclusion_investigacion',
                                  'resolucion','medida_cautelar','archivo','comentario_interno'
                                )),
            descripcion         TEXT NOT NULL,
            firmado_por         UUID NOT NULL,              -- usuario que firma
            hash_sha256         VARCHAR(64) NOT NULL,       -- hash del contenido
            firma_digital       TEXT NOT NULL,              -- firma PKCS#7
            sell_tiempo_tsa     TEXT,                       -- token TSA (RFC 3161, base64)
            documentos          JSONB DEFAULT '[]',         -- refs a object storage
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            -- Sin UPDATE: este log es inmutable
        )
    $sql$, v_schema, v_schema);

    -- Plazos legales del expediente
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.expediente_plazos (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            expediente_id   UUID NOT NULL REFERENCES %I.expedientes(id) ON DELETE CASCADE,
            tipo            VARCHAR(50) NOT NULL,           -- 'acuse_recibo', 'investigacion', 'resolucion'
            fecha_limite    TIMESTAMPTZ NOT NULL,
            completado      BOOLEAN NOT NULL DEFAULT FALSE,
            completado_at   TIMESTAMPTZ,
            base_normativa  VARCHAR(255),                   -- 'Ley 2/2023 art. 19'
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema, v_schema);

    -- ── M2: Asistente IA ────────────────────────────────────────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.conversaciones_ia (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id      UUID,                           -- NULL para sesiones anónimas
            estado          VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','finalizada','derivada')),
            nivel_riesgo    SMALLINT CHECK (nivel_riesgo BETWEEN 0 AND 4),
            evaluacion      JSONB,                          -- EvaluacionGravedad
            derivacion      VARCHAR(50),                   -- 'denuncia', 'contacto', 'formacion'
            -- Retención corta: 90 días (RGPD minimización)
            expira_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema);

    -- ── M3: Formación ───────────────────────────────────────────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.cursos (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            titulo          VARCHAR(255) NOT NULL,
            descripcion     TEXT,
            tipo            VARCHAR(30) NOT NULL CHECK (tipo IN ('video','documento','quiz','scorm','podcast')),
            duracion_min    INTEGER,
            url_contenido   TEXT,
            url_transcripcion TEXT,                         -- accesibilidad WCAG 2.1 AA
            obligatorio     BOOLEAN NOT NULL DEFAULT FALSE,
            activo          BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.progreso_formacion (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id      UUID NOT NULL,
            curso_id        UUID NOT NULL REFERENCES %I.cursos(id),
            porcentaje      SMALLINT NOT NULL DEFAULT 0 CHECK (porcentaje BETWEEN 0 AND 100),
            completado      BOOLEAN NOT NULL DEFAULT FALSE,
            completado_at   TIMESTAMPTZ,
            puntuacion_quiz SMALLINT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (usuario_id, curso_id)
        )
    $sql$, v_schema, v_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.certificados (
            id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id          UUID NOT NULL,
            curso_id            UUID NOT NULL REFERENCES %I.cursos(id),
            codigo_verificacion VARCHAR(20) UNIQUE NOT NULL,
            emitido_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expira_at           TIMESTAMPTZ
        )
    $sql$, v_schema, v_schema);

    -- ── M4: Línea de contacto ───────────────────────────────────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.personas_designadas (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id      UUID NOT NULL UNIQUE,
            especialidad    VARCHAR(100),
            disponibilidad  JSONB,                          -- DisponibilidadHoraria
            activa          BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.citas (
            id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            solicitante_id      UUID NOT NULL,
            persona_designada_id UUID NOT NULL REFERENCES %I.personas_designadas(id),
            fecha_hora          TIMESTAMPTZ NOT NULL,
            motivo_cifrado      TEXT,
            iv_b64              VARCHAR(32),
            estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','cancelada','realizada')),
            notas_cifradas      TEXT,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema, v_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.mensajes_internos (
            id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            remitente_id        UUID NOT NULL,
            destinatario_id     UUID NOT NULL,
            ciphertext_b64      TEXT NOT NULL,              -- E2E cifrado
            iv_b64              VARCHAR(32) NOT NULL,
            leido               BOOLEAN NOT NULL DEFAULT FALSE,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema);

    -- ── M7: Clima laboral ───────────────────────────────────────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.encuestas_clima (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            titulo          VARCHAR(255) NOT NULL,
            descripcion     TEXT,
            activa          BOOLEAN NOT NULL DEFAULT FALSE,
            fecha_inicio    TIMESTAMPTZ,
            fecha_fin       TIMESTAMPTZ,
            dimensiones     JSONB NOT NULL DEFAULT '[]',    -- DimensionFpsico[]
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema);

    -- SIN usuario_id: anonimato real (k-anonimato k≥5 en queries)
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.respuestas_clima (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            encuesta_id     UUID NOT NULL REFERENCES %I.encuestas_clima(id),
            respuestas      JSONB NOT NULL,                 -- Record<dimension, 1-5>
            segmento        VARCHAR(100),                   -- departamento / turno (sin identificar)
            fecha           DATE NOT NULL DEFAULT CURRENT_DATE  -- solo fecha, no hora (minimización)
        )
    $sql$, v_schema, v_schema);

    -- ── M8: Mediación y pares de apoyo ──────────────────────────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.pares_apoyo (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id      UUID NOT NULL UNIQUE,
            formacion_completada BOOLEAN NOT NULL DEFAULT FALSE,
            activo          BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.mediaciones (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            expediente_id   UUID REFERENCES %I.expedientes(id),
            mediador_id     UUID,
            estado          VARCHAR(20) NOT NULL DEFAULT 'solicitada' CHECK (estado IN ('solicitada','en_proceso','completada','cancelada')),
            acuerdo_cifrado TEXT,
            iv_b64          VARCHAR(32),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema, v_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.registros_represalia (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            denunciante_id  UUID,
            denuncia_id     UUID REFERENCES %I.denuncias(id),
            descripcion_cifrada TEXT NOT NULL,
            iv_b64          VARCHAR(32) NOT NULL,
            estado          VARCHAR(20) NOT NULL DEFAULT 'registrada' CHECK (estado IN ('registrada','investigando','resuelta')),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    $sql$, v_schema, v_schema);

    -- ── Audit log (inmutable, todas las acciones sensibles) ─────────
    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.audit_log (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id      UUID,
            accion          VARCHAR(100) NOT NULL,          -- AccionAudit enum
            recurso         VARCHAR(50) NOT NULL,           -- RecursoAudit enum
            recurso_id      UUID,
            resultado       VARCHAR(10) NOT NULL DEFAULT 'ok' CHECK (resultado IN ('ok','error','denegado')),
            detalle         JSONB,
            ip_hash         VARCHAR(64),                    -- SHA-256 de la IP
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            -- Sin UPDATE: log inmutable
        )
    $sql$, v_schema);

    -- ── Índices por schema de empresa ────────────────────────────────
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_denuncias_tracking   ON %I.denuncias(tracking_code)',                     v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_denuncias_estado      ON %I.denuncias(estado, created_at DESC)',           v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_denuncias_instructor  ON %I.denuncias(instructor_id)',                     v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_expedientes_estado    ON %I.expedientes(estado, fecha_apertura DESC)',     v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_expedientes_denuncia  ON %I.expedientes(denuncia_id)',                     v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_exp_eventos_exp       ON %I.expediente_eventos(expediente_id, created_at)',v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_conv_ia_usuario       ON %I.conversaciones_ia(usuario_id)',                v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_progreso_usuario      ON %I.progreso_formacion(usuario_id)',               v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_respuestas_encuesta   ON %I.respuestas_clima(encuesta_id, fecha)',         v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_audit_log_accion      ON %I.audit_log(accion, created_at DESC)',           v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_audit_log_usuario     ON %I.audit_log(usuario_id, created_at DESC)',       v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_mensajes_dest         ON %I.mensajes_internos(destinatario_id, leido)',    v_cif_norm, v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_plazos_exp            ON %I.expediente_plazos(expediente_id, completado)', v_cif_norm, v_schema);

    RETURN v_schema;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCIÓN: eliminar_schema_empresa(p_empresa_id)
-- Derecho al olvido empresarial (RGPD art. 17)
-- Requiere confirmación: p_confirmar = 'ELIMINAR_' || cif
-- ============================================================
CREATE OR REPLACE FUNCTION public.eliminar_schema_empresa(
    p_empresa_id UUID,
    p_confirmar  TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_schema  VARCHAR;
    v_cif     VARCHAR;
    v_confirm VARCHAR;
BEGIN
    SELECT schema_name, cif INTO v_schema, v_cif
    FROM public.empresas
    WHERE id = p_empresa_id AND activa = FALSE;

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Empresa no encontrada o todavía activa. Desactívala antes de eliminar.';
    END IF;

    v_confirm := 'ELIMINAR_' || upper(v_cif);
    IF p_confirmar != v_confirm THEN
        RAISE EXCEPTION 'Confirmación incorrecta. Escribe exactamente: %', v_confirm;
    END IF;

    -- Borrar schema completo (CASCADE borra todas las tablas y datos)
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema);

    -- Borrar metadatos globales (usuarios y tokens)
    DELETE FROM public.refresh_tokens rt
    USING public.usuarios u
    WHERE rt.usuario_id = u.id AND u.empresa_id = p_empresa_id;

    DELETE FROM public.usuarios WHERE empresa_id = p_empresa_id;
    DELETE FROM public.empresas WHERE id = p_empresa_id;

    -- Auditoría global del borrado
    INSERT INTO public.auditoria_global (accion, empresa_id, detalle)
    VALUES ('EMPRESA_ELIMINADA', NULL, jsonb_build_object(
        'empresa_id', p_empresa_id,
        'schema', v_schema,
        'cif', v_cif,
        'eliminado_at', NOW()
    ));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
