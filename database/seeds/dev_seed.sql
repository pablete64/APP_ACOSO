-- ============================================================
-- SafeWork AI — Seed de DESARROLLO
-- 2 empresas ficticias, 5 usuarios por rol, 3 denuncias, 2 expedientes
-- ⚠️  NUNCA ejecutar en producción
-- ============================================================

\c safework_db;

-- ── Empresas ficticias ──────────────────────────────────────────────────────

INSERT INTO public.empresas (id, cif, razon_social, schema_name, plan_id, dpo_email, num_empleados, sector)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'A12345678', 'Constructora Demo S.L.',   'empresa_a12345678', 'professional', 'dpo@constructora-demo.es', 120, 'Construcción'),
    ('22222222-2222-2222-2222-222222222222', 'B98765432', 'Servicios Beta S.A.',       'empresa_b98765432', 'starter',      'dpo@beta.es',              35,  'Servicios')
ON CONFLICT (cif) DO NOTHING;

-- Crear schemas de empresa con TODAS las tablas
SELECT public.crear_schema_empresa('11111111-1111-1111-1111-111111111111', 'A12345678');
SELECT public.crear_schema_empresa('22222222-2222-2222-2222-222222222222', 'B98765432');

-- ── Usuarios — Empresa A (Constructora Demo S.L.) ────────────────────────────
-- Password de todos: "Demo1234!" — hash Argon2id de ejemplo (en prod se genera dinámicamente)
-- En dev usamos bcrypt simplificado para no depender de libargon2 al aplicar el seed

INSERT INTO public.usuarios (id, empresa_id, email, password_hash, salt_b64, perfil, nombre)
VALUES
    -- Trabajadores
    ('a1000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'carmen@constructora-demo.es',   '$2b$12$devSaltHashPlaceholderXXXXXXXXXXXXXXXXXXXXXXXXX', 'devSaltB64==', 'trabajador',            'Carmen Martínez'),
    ('a1000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
     'luis@constructora-demo.es',     '$2b$12$devSaltHashPlaceholderXXXXXXXXXXXXXXXXXXXXXXXXX', 'devSaltB64==', 'trabajador',            'Luis García'),
    -- Responsable de Igualdad
    ('a1000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
     'elena@constructora-demo.es',    '$2b$12$devSaltHashPlaceholderXXXXXXXXXXXXXXXXXXXXXXXXX', 'devSaltB64==', 'responsable_igualdad',  'Elena Sánchez'),
    -- RRHH / Legal
    ('a1000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
     'jose@constructora-demo.es',     '$2b$12$devSaltHashPlaceholderXXXXXXXXXXXXXXXXXXXXXXXXX', 'devSaltB64==', 'rrhh_legal',            'José Fernández'),
    -- Dirección
    ('a1000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
     'director@constructora-demo.es', '$2b$12$devSaltHashPlaceholderXXXXXXXXXXXXXXXXXXXXXXXXX', 'devSaltB64==', 'direccion',             'Ana López')
ON CONFLICT (email) DO NOTHING;

-- ── Usuarios — Empresa B (Servicios Beta S.A.) ───────────────────────────────
INSERT INTO public.usuarios (id, empresa_id, email, password_hash, salt_b64, perfil, nombre)
VALUES
    ('b2000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
     'maria@beta.es',  '$2b$12$devSaltHashPlaceholderXXXXXXXXXXXXXXXXXXXXXXXXX', 'devSaltB64==', 'trabajador',           'María Ruiz'),
    ('b2000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
     'carlos@beta.es', '$2b$12$devSaltHashPlaceholderXXXXXXXXXXXXXXXXXXXXXXXXX', 'devSaltB64==', 'responsable_igualdad', 'Carlos Díaz')
ON CONFLICT (email) DO NOTHING;

-- ── Denuncias — Empresa A ────────────────────────────────────────────────────
-- ciphertext_b64 es un placeholder de texto cifrado real (en dev el cliente lo cifra)

INSERT INTO empresa_a12345678.denuncias
    (id, tracking_code, modalidad, tipo_acoso, estado, gravedad_ia, ciphertext_b64, iv_b64, denunciante_id, instructor_id)
VALUES
    ('d1000001-0000-0000-0000-000000000001', 'ABCD1234EF', 'anonima',       'acoso_sexual',   'en_revision',    'alta',    'cGxhY2Vob2xkZXJjaXBoZXJ0ZXh0', 'cGxhY2Vob2xk', NULL,                                    'a1000001-0000-0000-0000-000000000004'),
    ('d1000001-0000-0000-0000-000000000002', 'GHIJ5678KL', 'identificada',  'acoso_laboral',  'recibida',       'media',   'cGxhY2Vob2xkZXJjaXBoZXJ0ZXh0', 'cGxhY2Vob2xk', 'a1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004'),
    ('d1000001-0000-0000-0000-000000000003', 'MNOP9012QR', 'anonima',       'discriminacion', 'resuelta',       'baja',    'cGxhY2Vob2xkZXJjaXBoZXJ0ZXh0', 'cGxhY2Vob2xk', NULL,                                    'a1000001-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ── Expedientes — Empresa A ──────────────────────────────────────────────────
INSERT INTO empresa_a12345678.expedientes
    (id, denuncia_id, referencia, estado, instructor_id, fecha_apertura)
VALUES
    ('e1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', 'EXP-2026-001', 'en_instruccion', 'a1000001-0000-0000-0000-000000000004', NOW() - INTERVAL '15 days'),
    ('e1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000003', 'EXP-2026-002', 'archivado',      'a1000001-0000-0000-0000-000000000004', NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- Plazos legales del expediente 1
INSERT INTO empresa_a12345678.expediente_plazos
    (expediente_id, tipo, fecha_limite, base_normativa)
VALUES
    ('e1000001-0000-0000-0000-000000000001', 'acuse_recibo',  NOW() - INTERVAL '8 days',  'Ley 2/2023 art. 19'),
    ('e1000001-0000-0000-0000-000000000001', 'investigacion', NOW() + INTERVAL '75 days', 'Ley 2/2023 art. 20'),
    ('e1000001-0000-0000-0000-000000000001', 'resolucion',    NOW() + INTERVAL '85 days', 'Ley 2/2023 art. 22')
ON CONFLICT DO NOTHING;

-- ── Cursos de formación M3 — Empresa A ──────────────────────────────────────
-- Los 4 cursos del ROADMAP con módulos granulares y biblioteca normativa

INSERT INTO empresa_a12345678.cursos
    (id, titulo, descripcion, objetivos, perfiles_destino, duracion_total_minutos, num_modulos, orden, activo)
VALUES
    (
        'c0000001-0000-0000-0000-000000000001',
        'Acoso laboral: identificación y prevención',
        'Curso fundamental sobre qué es el acoso laboral, sus formas, cómo identificarlo y las obligaciones legales del empleador.',
        ARRAY[
            'Distinguir entre conflicto laboral y acoso',
            'Identificar los distintos tipos de acoso (moral, sexual, por razón de sexo)',
            'Conocer las obligaciones legales del empleador en materia preventiva',
            'Saber a quién acudir en caso de ser víctima o testigo'
        ],
        ARRAY['trabajador','rrhh','igualdad','direccion'],
        55, 4, 1, TRUE
    ),
    (
        'c0000001-0000-0000-0000-000000000002',
        'Marco legal: Ley 2/2023 y derechos del denunciante',
        'Comprende la normativa vigente sobre canal de denuncias, protección del informante y plazos de respuesta obligatorios.',
        ARRAY[
            'Entender el alcance y obligaciones de la Ley 2/2023',
            'Conocer los derechos de protección frente a represalias',
            'Identificar los plazos legales del procedimiento de denuncia',
            'Saber cómo funciona el canal seguro de la empresa'
        ],
        ARRAY['trabajador','rrhh','igualdad','legal'],
        45, 3, 2, TRUE
    ),
    (
        'c0000001-0000-0000-0000-000000000003',
        'Cómo actuar: víctimas, testigos y responsables',
        'Guía práctica de actuación ante situaciones de acoso para los diferentes roles: víctima, testigo, mando intermedio y equipo de igualdad.',
        ARRAY[
            'Conocer el protocolo de actuación paso a paso',
            'Saber cómo documentar evidencias correctamente',
            'Entender el rol de los mandos intermedios en la prevención',
            'Aplicar técnicas de apoyo emocional a compañeros afectados'
        ],
        ARRAY['trabajador','rrhh','igualdad'],
        50, 4, 3, TRUE
    ),
    (
        'c0000001-0000-0000-0000-000000000004',
        'Gestión emocional y resiliencia en el entorno laboral',
        'Herramientas psicológicas para gestionar el impacto emocional del acoso, desarrollar resiliencia y promover un clima laboral saludable.',
        ARRAY[
            'Identificar el impacto psicológico del acoso en víctimas y testigos',
            'Aplicar técnicas básicas de regulación emocional',
            'Reconocer señales de alerta de deterioro del clima laboral',
            'Activar recursos de apoyo internos y externos'
        ],
        ARRAY['trabajador','rrhh'],
        60, 4, 4, TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- ── Módulos — Curso 1: Acoso laboral ────────────────────────────────────────
INSERT INTO empresa_a12345678.modulos_formacion
    (id, curso_id, titulo, orden, tipo, duracion_minutos)
VALUES
    ('m0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Qué es el acoso laboral',                1, 'video',  15),
    ('m0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Tipos de acoso: moral, sexual y mixto',  2, 'texto',  10),
    ('m0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Obligaciones legales del empleador',     3, 'video',  20),
    ('m0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'Evaluación final — Módulo 1',            4, 'quiz',   10)
ON CONFLICT (id) DO NOTHING;

-- ── Módulos — Curso 2: Marco legal ──────────────────────────────────────────
INSERT INTO empresa_a12345678.modulos_formacion
    (id, curso_id, titulo, orden, tipo, duracion_minutos)
VALUES
    ('m0000002-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Ley 2/2023: ámbito y obligaciones',     1, 'texto',  15),
    ('m0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Protección del denunciante',            2, 'video',  20),
    ('m0000002-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'Evaluación final — Módulo 2',           3, 'quiz',   10)
ON CONFLICT (id) DO NOTHING;

-- ── Módulos — Curso 3: Cómo actuar ──────────────────────────────────────────
INSERT INTO empresa_a12345678.modulos_formacion
    (id, curso_id, titulo, orden, tipo, duracion_minutos)
VALUES
    ('m0000003-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000003', 'Soy víctima: primeros pasos',           1, 'video',  15),
    ('m0000003-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Soy testigo: cómo ayudar',              2, 'texto',  10),
    ('m0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003', 'El rol del mando intermedio',           3, 'video',  15),
    ('m0000003-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', 'Evaluación final — Módulo 3',           4, 'quiz',   10)
ON CONFLICT (id) DO NOTHING;

-- ── Módulos — Curso 4: Gestión emocional ────────────────────────────────────
INSERT INTO empresa_a12345678.modulos_formacion
    (id, curso_id, titulo, orden, tipo, duracion_minutos)
VALUES
    ('m0000004-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004', 'Impacto psicológico del acoso',         1, 'video',  20),
    ('m0000004-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'Técnicas de regulación emocional',      2, 'texto',  15),
    ('m0000004-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000004', 'Recursos de apoyo internos y externos', 3, 'video',  15),
    ('m0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', 'Evaluación final — Módulo 4',           4, 'quiz',   10)
ON CONFLICT (id) DO NOTHING;

-- ── Encuesta de clima — Empresa A ────────────────────────────────────────────
INSERT INTO empresa_a12345678.encuestas_clima (titulo, descripcion, activa, fecha_inicio, fecha_fin, dimensiones)
VALUES (
    'Clima laboral Q2-2026',
    'Evaluación trimestral de factores psicosociales FPSICO/INSST',
    TRUE,
    NOW(),
    NOW() + INTERVAL '14 days',
    '["autonomia","carga_trabajo","demandas_cognitivas","variedad_contenido","participacion","interes_compensacion","desempeño_rol","relaciones_apoyo"]'
) ON CONFLICT DO NOTHING;
