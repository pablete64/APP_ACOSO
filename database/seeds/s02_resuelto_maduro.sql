-- ============================================================
-- SEED S02 — Finanzas Meridian S.A.
-- ESCENARIO: Empresa madura · Denuncias resueltas · Formación 100% · KPIs verde
-- ⚠️  Solo para desarrollo/demo. Nunca en producción.
-- ============================================================
-- Contraseña de todos los usuarios: Demo1234!
-- ============================================================

\c safework_db;

-- ── Empresa ───────────────────────────────────────────────────
INSERT INTO public.empresas (id, cif, razon_social, schema_name, plan_id, dpo_email, num_empleados, sector)
VALUES ('20000002-0000-0000-0000-000000000001', 'B22222222', 'Finanzas Meridian S.A.',
        'empresa_b22222222', 'enterprise', 'dpo@meridian.es', 210, 'Servicios financieros')
ON CONFLICT (cif) DO NOTHING;

SELECT public.crear_schema_empresa('20000002-0000-0000-0000-000000000001', 'B22222222');

-- ── Usuarios (contraseña: Demo1234!) ─────────────────────────
INSERT INTO public.usuarios (id, empresa_id, email, password_hash, salt_b64, perfil, nombre, activo)
VALUES
    ('20000002-0000-0000-0000-000000000010', '20000002-0000-0000-0000-000000000001',
     'trabajador@meridian.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'trabajador', 'Sofía Blanco', TRUE),

    ('20000002-0000-0000-0000-000000000011', '20000002-0000-0000-0000-000000000001',
     'igualdad@meridian.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'responsable_igualdad', 'Marta Iglesias', TRUE),

    ('20000002-0000-0000-0000-000000000012', '20000002-0000-0000-0000-000000000001',
     'rrhh@meridian.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'rrhh_legal', 'Pablo Díaz', TRUE),

    ('20000002-0000-0000-0000-000000000013', '20000002-0000-0000-0000-000000000001',
     'director@meridian.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'direccion', 'Roberto Méndez', TRUE),

    ('20000002-0000-0000-0000-000000000014', '20000002-0000-0000-0000-000000000001',
     'inspector@meridian.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'inspector', 'Cristina Lara', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ── Denuncias: ambas cerradas ─────────────────────────────────
INSERT INTO empresa_b22222222.denuncias
    (id, tracking_code, modalidad, tipo_acoso, estado, gravedad_ia, ciphertext_b64, iv_b64,
     denunciante_id, instructor_id, created_at, updated_at)
VALUES
    (
        '20000002-0000-0000-1000-000000000001', 'MER001ABC', 'identificada',
        'acoso_laboral', 'resuelta', 'media',
        'SW1wb3J0YW50ZTogZXN0ZSBlcyB1biBjaXBoZXJ0ZXh0IGRlIG11ZXN0cmE=',
        'aXZfc2FtcGxlX2RlbW8=',
        '20000002-0000-0000-0000-000000000010',
        '20000002-0000-0000-0000-000000000012',
        NOW() - INTERVAL '120 days', NOW() - INTERVAL '30 days'
    ),
    (
        '20000002-0000-0000-1000-000000000002', 'MER002DEF', 'anonima',
        'discriminacion', 'archivada', 'baja',
        'SW1wb3J0YW50ZTogZXN0ZSBlcyB1biBjaXBoZXJ0ZXh0IGRlIG11ZXN0cmE=',
        'aXZfc2FtcGxlX2RlbW8=',
        NULL, '20000002-0000-0000-0000-000000000012',
        NOW() - INTERVAL '200 days', NOW() - INTERVAL '90 days'
    )
ON CONFLICT DO NOTHING;

-- ── Expedientes: ambos cerrados ───────────────────────────────
INSERT INTO empresa_b22222222.expedientes
    (id, denuncia_id, referencia, estado, instructor_id, fecha_apertura, fecha_cierre, resolucion)
VALUES
    (
        '20000002-0000-0000-2000-000000000001',
        '20000002-0000-0000-1000-000000000001',
        'EXP-2026-001', 'resuelto',
        '20000002-0000-0000-0000-000000000012',
        NOW() - INTERVAL '118 days', NOW() - INTERVAL '30 days',
        'Tras investigación se constatan conductas de acoso laboral. Se impone sanción disciplinaria al denunciado conforme al art. 54 ET. Trabajadora readscrita a otro departamento con su conformidad.'
    ),
    (
        '20000002-0000-0000-2000-000000000002',
        '20000002-0000-0000-1000-000000000002',
        'EXP-2025-005', 'archivado',
        '20000002-0000-0000-0000-000000000012',
        NOW() - INTERVAL '198 days', NOW() - INTERVAL '90 days',
        'No se han podido acreditar los hechos denunciados. Se archiva el expediente sin perjuicio de que puedan aportarse nuevas evidencias.'
    )
ON CONFLICT DO NOTHING;

-- Plazos del expediente 1 (todos completados)
INSERT INTO empresa_b22222222.expediente_plazos
    (expediente_id, tipo, fecha_limite, completado, completado_at, base_normativa)
VALUES
    ('20000002-0000-0000-2000-000000000001', 'acuse_recibo',
     NOW() - INTERVAL '111 days', TRUE, NOW() - INTERVAL '112 days', 'Ley 2/2023 art. 19'),
    ('20000002-0000-0000-2000-000000000001', 'investigacion',
     NOW() - INTERVAL '28 days', TRUE, NOW() - INTERVAL '32 days', 'Ley 2/2023 art. 20'),
    ('20000002-0000-0000-2000-000000000001', 'resolucion',
     NOW() - INTERVAL '18 days', TRUE, NOW() - INTERVAL '30 days', 'Ley 2/2023 art. 22')
ON CONFLICT DO NOTHING;

-- ── Cursos y formación al 100% ────────────────────────────────
INSERT INTO empresa_b22222222.cursos
    (id, titulo, descripcion, tipo, duracion_min, obligatorio, activo)
VALUES
    ('c2000002-0000-0000-0000-000000000001',
     'Acoso laboral: identificación y prevención', 'Curso obligatorio completo.',
     'video', 55, TRUE, TRUE),
    ('c2000002-0000-0000-0000-000000000002',
     'Marco legal: Ley 2/2023', 'Normativa y plazos.',
     'documento', 45, TRUE, TRUE),
    ('c2000002-0000-0000-0000-000000000003',
     'Cómo actuar: víctimas, testigos y responsables', 'Protocolo paso a paso.',
     'video', 50, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Todos los usuarios con formación completa
INSERT INTO empresa_b22222222.progreso_formacion
    (usuario_id, curso_id, porcentaje, completado, completado_at, puntuacion_quiz)
SELECT u.id, c.id, 100, TRUE, NOW() - INTERVAL '60 days', 85
FROM (
    VALUES
        ('20000002-0000-0000-0000-000000000010'::uuid),
        ('20000002-0000-0000-0000-000000000011'::uuid),
        ('20000002-0000-0000-0000-000000000012'::uuid),
        ('20000002-0000-0000-0000-000000000013'::uuid)
) u(id)
CROSS JOIN (
    VALUES
        ('c2000002-0000-0000-0000-000000000001'::uuid),
        ('c2000002-0000-0000-0000-000000000002'::uuid),
        ('c2000002-0000-0000-0000-000000000003'::uuid)
) c(id)
ON CONFLICT (usuario_id, curso_id) DO NOTHING;

-- Certificados emitidos
INSERT INTO empresa_b22222222.certificados
    (usuario_id, curso_id, codigo_verificacion, emitido_at)
SELECT u.id, 'c2000002-0000-0000-0000-000000000001',
       'CERT-MER-' || substring(u.id::text, 1, 8),
       NOW() - INTERVAL '60 days'
FROM (
    VALUES
        ('20000002-0000-0000-0000-000000000010'::uuid),
        ('20000002-0000-0000-0000-000000000011'::uuid),
        ('20000002-0000-0000-0000-000000000012'::uuid),
        ('20000002-0000-0000-0000-000000000013'::uuid)
) u(id)
ON CONFLICT DO NOTHING;

-- ── Clima laboral — encuesta cerrada con buenos resultados ────
INSERT INTO empresa_b22222222.encuestas_clima
    (id, titulo, descripcion, activa, fecha_inicio, fecha_fin, dimensiones)
VALUES (
    '20000002-0000-0000-3000-000000000001',
    'Clima laboral Q1-2026',
    'Evaluación trimestral FPSICO/INSST',
    FALSE, NOW() - INTERVAL '45 days', NOW() - INTERVAL '31 days',
    '["autonomia","carga_trabajo","demandas_cognitivas","variedad_contenido","participacion","interes_compensacion","desempeño_rol","relaciones_apoyo"]'
) ON CONFLICT DO NOTHING;

-- Respuestas con puntuaciones altas (clima saludable)
INSERT INTO empresa_b22222222.respuestas_clima
    (encuesta_id, respuestas, segmento, fecha)
SELECT
    '20000002-0000-0000-3000-000000000001',
    '{"autonomia":4,"carga_trabajo":3,"demandas_cognitivas":3,"variedad_contenido":4,"participacion":4,"interes_compensacion":4,"desempeño_rol":5,"relaciones_apoyo":5}',
    'Sede Central', s.d
FROM generate_series(NOW() - INTERVAL '44 days', NOW() - INTERVAL '32 days', '1 day'::interval) s(d);
