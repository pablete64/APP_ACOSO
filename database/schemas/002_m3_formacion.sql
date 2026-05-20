-- ============================================================
-- Migración 002 — M3 Formación: alinea tablas con el servicio
-- ============================================================
-- Extiende las tablas creadas en 001_init.sql:
--   · cursos         → añade columnas requeridas por formacion_service
--   · progreso_formacion → renombra porcentaje → progreso_pct, añade certificado_id
--   · certificados   → añade created_at (era emitido_at)
-- Y crea tablas nuevas:
--   · modulos_formacion, progreso_modulo (por módulo granular)
--   · biblioteca_normativa (recursos legales compartidos en public)
-- ============================================================

-- Se aplica en el schema público para biblioteca (recursos compartidos entre tenants)
CREATE TABLE IF NOT EXISTS public.biblioteca_normativa (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo      VARCHAR(500) NOT NULL,
    tipo        VARCHAR(30) NOT NULL CHECK (tipo IN ('ley','reglamento','guia','jurisprudencia','protocolo')),
    organismo   VARCHAR(200) NOT NULL,
    url         TEXT NOT NULL,
    fecha       DATE NOT NULL,
    resumen     TEXT,
    etiquetas   TEXT[] NOT NULL DEFAULT '{}',
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_tipo  ON public.biblioteca_normativa(tipo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_fecha ON public.biblioteca_normativa(fecha DESC);

-- ── Por-tenant: extiende cursos y añade modulos ──────────────────────────────
-- Nota: esta migración se aplica por CIF via la función init_empresa_schema
-- Para aplicar en tenants existentes ejecutar el bloque DO por cada schema activo

DO $$
DECLARE
    v_schema TEXT;
BEGIN
    FOR v_schema IN
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name LIKE 'empresa_%'
    LOOP
        -- Ampliar tabla cursos
        EXECUTE format('ALTER TABLE %I.cursos ADD COLUMN IF NOT EXISTS orden              SMALLINT NOT NULL DEFAULT 0', v_schema);
        EXECUTE format('ALTER TABLE %I.cursos ADD COLUMN IF NOT EXISTS objetivos          TEXT[]   NOT NULL DEFAULT ''{}''', v_schema);
        EXECUTE format('ALTER TABLE %I.cursos ADD COLUMN IF NOT EXISTS perfiles_destino   TEXT[]   NOT NULL DEFAULT ''{}''', v_schema);
        EXECUTE format('ALTER TABLE %I.cursos ADD COLUMN IF NOT EXISTS duracion_total_minutos INTEGER', v_schema);
        EXECUTE format('ALTER TABLE %I.cursos ADD COLUMN IF NOT EXISTS num_modulos        SMALLINT NOT NULL DEFAULT 0', v_schema);

        -- Crear modulos_formacion
        EXECUTE format($sql$
            CREATE TABLE IF NOT EXISTS %I.modulos_formacion (
                id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                curso_id         UUID NOT NULL REFERENCES %I.cursos(id) ON DELETE CASCADE,
                titulo           VARCHAR(255) NOT NULL,
                orden            SMALLINT NOT NULL DEFAULT 0,
                tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('video','texto','quiz')),
                duracion_minutos SMALLINT NOT NULL DEFAULT 0,
                activo           BOOLEAN NOT NULL DEFAULT TRUE,
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $sql$, v_schema, v_schema);

        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_modulos_curso ON %I.modulos_formacion(curso_id, orden)', replace(v_schema,'empresa_',''), v_schema);

        -- Crear progreso_modulo
        EXECUTE format($sql$
            CREATE TABLE IF NOT EXISTS %I.progreso_modulo (
                id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                usuario_id  UUID NOT NULL,
                modulo_id   UUID NOT NULL REFERENCES %I.modulos_formacion(id) ON DELETE CASCADE,
                puntuacion  SMALLINT CHECK (puntuacion BETWEEN 0 AND 100),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (usuario_id, modulo_id)
            )
        $sql$, v_schema, v_schema);

        -- Añadir progreso_pct y certificado_id a progreso_formacion
        EXECUTE format('ALTER TABLE %I.progreso_formacion ADD COLUMN IF NOT EXISTS progreso_pct   SMALLINT NOT NULL DEFAULT 0 CHECK (progreso_pct BETWEEN 0 AND 100)', v_schema);
        EXECUTE format('ALTER TABLE %I.progreso_formacion ADD COLUMN IF NOT EXISTS certificado_id UUID REFERENCES %I.certificados(id)', v_schema, v_schema);
        EXECUTE format('ALTER TABLE %I.progreso_formacion ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()', v_schema);

        -- Renombrar porcentaje → progreso_pct si existe (compatibilidad hacia atrás)
        EXECUTE format($sql$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %L AND table_name = 'progreso_formacion' AND column_name = 'porcentaje'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %L AND table_name = 'progreso_formacion' AND column_name = 'progreso_pct'
                ) THEN
                    ALTER TABLE %I.progreso_formacion RENAME COLUMN porcentaje TO progreso_pct;
                END IF;
            END
            $inner$;
        $sql$, v_schema, v_schema, v_schema);

        -- Añadir created_at a certificados (era emitido_at)
        EXECUTE format('ALTER TABLE %I.certificados ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', v_schema);

    END LOOP;
END;
$$;

-- Añadir también a la función init_empresa_schema para nuevos tenants
-- (parcheamos la definición en 001_init.sql comentando y redirigiendo aquí;
--  los tenants nuevos aplican ambas migraciones en orden)

-- ── Seeds biblioteca normativa (recursos oficiales españoles) ────────────────
INSERT INTO public.biblioteca_normativa
    (titulo, tipo, organismo, url, fecha, resumen, etiquetas)
VALUES
    (
        'Ley Orgánica 3/2007, de 22 de marzo, para la igualdad efectiva de mujeres y hombres',
        'ley', 'BOE',
        'https://www.boe.es/buscar/act.php?id=BOE-A-2007-6115',
        '2007-03-22',
        'Marco normativo básico de igualdad de género en el empleo. El art. 48 obliga a las empresas a adoptar medidas para prevenir el acoso sexual y el acoso por razón de sexo.',
        ARRAY['igualdad','género','acoso sexual','art. 48']
    ),
    (
        'Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas que informen sobre infracciones normativas',
        'ley', 'BOE',
        'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513',
        '2023-02-20',
        'Transposición de la Directiva (UE) 2019/1937. Establece el canal seguro de denuncias, protección frente a represalias y plazos de respuesta obligatorios.',
        ARRAY['whistleblowing','canal de denuncias','represalias','plazos']
    ),
    (
        'Real Decreto 901/2020, de 13 de octubre, por el que se regulan los planes de igualdad y su registro',
        'reglamento', 'BOE',
        'https://www.boe.es/buscar/act.php?id=BOE-A-2020-12151',
        '2020-10-13',
        'Desarrollo reglamentario de la negociación, contenido y diagnóstico de los planes de igualdad en empresas de más de 50 trabajadores.',
        ARRAY['plan de igualdad','negociación','diagnóstico','registro']
    ),
    (
        'Criterio Técnico ITSS 69/2009 sobre acoso en el trabajo',
        'guia', 'ITSS',
        'https://www.mites.gob.es/itss/web/Atencion_al_Ciudadano/NORMATIVA_Y_DOCUMENTACION/DOCUMENTOS_DE_REFERENCIA/Criterios_Tecnicos/CT_69.pdf',
        '2009-01-01',
        'Guía de la Inspección de Trabajo para identificar y calificar conductas de acoso moral, sexual y por razón de sexo. Referencia para instructores de expedientes.',
        ARRAY['inspección','acoso moral','criterio técnico','ITSS']
    ),
    (
        'NTP 854: Acoso psicológico en el trabajo: definición',
        'guia', 'INSST',
        'https://www.insst.es/documents/94886/326827/ntp_854.pdf',
        '2009-01-01',
        'Nota técnica preventiva del INSST que define el acoso psicológico (mobbing), sus fases, consecuencias y medidas preventivas.',
        ARRAY['NTP','mobbing','prevención','INSST']
    ),
    (
        'NTP 891: Procedimiento de solución autónoma de los conflictos de violencia laboral (I)',
        'guia', 'INSST',
        'https://www.insst.es/documents/94886/326827/ntp_891.pdf',
        '2011-01-01',
        'Metodología de resolución interna de conflictos de violencia en el trabajo. Complemento a los protocolos de acoso.',
        ARRAY['NTP','protocolo','resolución','violencia laboral']
    ),
    (
        'Protocolo de actuación frente al acoso laboral en la Administración General del Estado',
        'protocolo', 'INAP',
        'https://www.inap.es/documents/10136/1514940/protocolo_acoso_2015.pdf',
        '2015-09-15',
        'Modelo de protocolo de referencia para elaborar protocolos en organizaciones públicas y privadas. Incluye instrucciones de actuación, fases y garantías procedimentales.',
        ARRAY['protocolo','AGE','modelo','procedimiento']
    ),
    (
        'Convenio OIT núm. 190 sobre violencia y acoso (ratificado por España en 2023)',
        'reglamento', 'OIT',
        'https://www.ilo.org/dyn/normlex/es/f?p=NORMLEXPUB:12100:0::NO::P12100_ILO_CODE:C190',
        '2019-06-21',
        'Primer instrumento internacional vinculante sobre violencia y acoso en el mundo del trabajo. Ratificado por España el 25 de mayo de 2023.',
        ARRAY['OIT','convenio 190','internacional','ratificación']
    )
ON CONFLICT DO NOTHING;
