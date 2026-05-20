-- ============================================================
-- SEED S01 — Construcciones Vega S.L.
-- ESCENARIO: Denuncia activa grave · Plazo vencido · Clima deteriorado
-- ⚠️  Solo para desarrollo/demo. Nunca en producción.
-- ============================================================
-- Contraseña de todos los usuarios: Demo1234!
-- ============================================================

\c safework_db;

-- ── Empresa ───────────────────────────────────────────────────
INSERT INTO public.empresas (id, cif, razon_social, schema_name, plan_id, dpo_email, num_empleados, sector)
VALUES ('10000001-0000-0000-0000-000000000001', 'A11111111', 'Construcciones Vega S.L.',
        'empresa_a11111111', 'professional', 'dpo@vega.es', 150, 'Construcción')
ON CONFLICT (cif) DO NOTHING;

SELECT public.crear_schema_empresa('10000001-0000-0000-0000-000000000001', 'A11111111');

-- ── Usuarios (contraseña: Demo1234!) ─────────────────────────
INSERT INTO public.usuarios (id, empresa_id, email, password_hash, salt_b64, perfil, nombre, activo)
VALUES
    ('10000001-0000-0000-0000-000000000010', '10000001-0000-0000-0000-000000000001',
     'trabajador@vega.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'trabajador', 'Carmen Ruiz', TRUE),

    ('10000001-0000-0000-0000-000000000011', '10000001-0000-0000-0000-000000000001',
     'igualdad@vega.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'responsable_igualdad', 'Elena Torres', TRUE),

    ('10000001-0000-0000-0000-000000000012', '10000001-0000-0000-0000-000000000001',
     'rrhh@vega.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'rrhh_legal', 'José Fernández', TRUE),

    ('10000001-0000-0000-0000-000000000013', '10000001-0000-0000-0000-000000000001',
     'director@vega.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'direccion', 'Ana Vega', TRUE),

    ('10000001-0000-0000-0000-000000000014', '10000001-0000-0000-0000-000000000001',
     'inspector@vega.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'inspector', 'Luis Morales', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ── Denuncias ─────────────────────────────────────────────────
-- Denuncia 1: acoso sexual, alta gravedad, en instrucción (activa y crítica)
INSERT INTO empresa_a11111111.denuncias
    (id, tracking_code, modalidad, tipo_acoso, estado, gravedad_ia, ciphertext_b64, iv_b64,
     denunciante_id, instructor_id, created_at, updated_at)
VALUES (
    '10000001-0000-0000-1000-000000000001', 'VEGA001ABC', 'anonima',
    'acoso_sexual', 'en_instruccion', 'alta',
    'SW1wb3J0YW50ZTogZXN0ZSBlcyB1biBjaXBoZXJ0ZXh0IGRlIG11ZXN0cmE=',
    'aXZfc2FtcGxlX2RlbW8=',
    NULL,
    '10000001-0000-0000-0000-000000000012',
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'
) ON CONFLICT DO NOTHING;

-- Denuncia 2: acoso laboral, media gravedad, recibida ayer
INSERT INTO empresa_a11111111.denuncias
    (id, tracking_code, modalidad, tipo_acoso, estado, gravedad_ia, ciphertext_b64, iv_b64,
     denunciante_id, instructor_id, created_at, updated_at)
VALUES (
    '10000001-0000-0000-1000-000000000002', 'VEGA002DEF', 'anonima',
    'acoso_laboral', 'recibida', 'media',
    'SW1wb3J0YW50ZTogZXN0ZSBlcyB1biBjaXBoZXJ0ZXh0IGRlIG11ZXN0cmE=',
    'aXZfc2FtcGxlX2RlbW8=',
    NULL, NULL,
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- ── Expediente ────────────────────────────────────────────────
INSERT INTO empresa_a11111111.expedientes
    (id, denuncia_id, referencia, estado, instructor_id, fecha_apertura, created_at, updated_at)
VALUES (
    '10000001-0000-0000-2000-000000000001',
    '10000001-0000-0000-1000-000000000001',
    'EXP-2026-001', 'en_instruccion',
    '10000001-0000-0000-0000-000000000012',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'
) ON CONFLICT DO NOTHING;

-- Plazos: el de acuse_recibo ya venció (crisis)
INSERT INTO empresa_a11111111.expediente_plazos
    (expediente_id, tipo, fecha_limite, completado, base_normativa)
VALUES
    ('10000001-0000-0000-2000-000000000001', 'acuse_recibo',
     NOW() - INTERVAL '11 days', FALSE, 'Ley 2/2023 art. 19'),
    ('10000001-0000-0000-2000-000000000001', 'investigacion',
     NOW() + INTERVAL '72 days', FALSE, 'Ley 2/2023 art. 20'),
    ('10000001-0000-0000-2000-000000000001', 'resolucion',
     NOW() + INTERVAL '82 days', FALSE, 'Ley 2/2023 art. 22')
ON CONFLICT DO NOTHING;

-- ── Encuesta de clima activa (resultados deteriorados) ────────
INSERT INTO empresa_a11111111.encuestas_clima
    (id, titulo, descripcion, activa, fecha_inicio, fecha_fin, dimensiones)
VALUES (
    '10000001-0000-0000-3000-000000000001',
    'Clima laboral Q2-2026',
    'Evaluación trimestral FPSICO/INSST',
    TRUE, NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days',
    '["autonomia","carga_trabajo","demandas_cognitivas","variedad_contenido","participacion","interes_compensacion","desempeño_rol","relaciones_apoyo"]'
) ON CONFLICT DO NOTHING;

-- Respuestas (puntuaciones bajas → riesgo alto)
INSERT INTO empresa_a11111111.respuestas_clima
    (encuesta_id, respuestas, segmento, fecha)
SELECT
    '10000001-0000-0000-3000-000000000001',
    '{"autonomia":2,"carga_trabajo":4,"demandas_cognitivas":4,"variedad_contenido":2,"participacion":1,"interes_compensacion":2,"desempeño_rol":3,"relaciones_apoyo":2}',
    'Obra Madrid', s.d
FROM generate_series(NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', '1 day'::interval) s(d);

-- ── Cursos (formación poco avanzada — escenario de crisis) ────
INSERT INTO empresa_a11111111.cursos
    (id, titulo, descripcion, tipo, duracion_min, obligatorio, activo)
VALUES
    ('c1000001-0000-0000-0000-000000000001',
     'Acoso laboral: identificación y prevención', 'Curso básico obligatorio.',
     'video', 55, TRUE, TRUE),
    ('c1000001-0000-0000-0000-000000000002',
     'Marco legal: Ley 2/2023', 'Derechos del denunciante y plazos.',
     'documento', 45, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Trabajador solo con 30% en el primer curso
INSERT INTO empresa_a11111111.progreso_formacion
    (usuario_id, curso_id, porcentaje, completado)
VALUES
    ('10000001-0000-0000-0000-000000000010', 'c1000001-0000-0000-0000-000000000001', 30, FALSE),
    ('10000001-0000-0000-0000-000000000012', 'c1000001-0000-0000-0000-000000000001', 60, FALSE)
ON CONFLICT (usuario_id, curso_id) DO NOTHING;
