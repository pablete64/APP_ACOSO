-- ============================================================
-- SEED S04 — Distribuciones Norte S.A.
-- ESCENARIO: Mediación en curso · Par de apoyo · Represalia cifrada
-- ⚠️  Solo para desarrollo/demo. Nunca en producción.
-- ============================================================
-- Contraseña de todos los usuarios: Demo1234!
-- ============================================================

\c safework_db;

-- ── Empresa ───────────────────────────────────────────────────
INSERT INTO public.empresas (id, cif, razon_social, schema_name, plan_id, dpo_email, num_empleados, sector)
VALUES ('40000004-0000-0000-0000-000000000001', 'D44444444', 'Distribuciones Norte S.A.',
        'empresa_d44444444', 'enterprise', 'dpo@dnorte.es', 180, 'Logística y distribución')
ON CONFLICT (cif) DO NOTHING;

SELECT public.crear_schema_empresa('40000004-0000-0000-0000-000000000001', 'D44444444');

-- ── Usuarios (contraseña: Demo1234!) ─────────────────────────
INSERT INTO public.usuarios (id, empresa_id, email, password_hash, salt_b64, perfil, nombre, activo)
VALUES
    ('40000004-0000-0000-0000-000000000010', '40000004-0000-0000-0000-000000000001',
     'trabajador@dnorte.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'trabajador', 'Isabel Romero', TRUE),

    ('40000004-0000-0000-0000-000000000011', '40000004-0000-0000-0000-000000000001',
     'igualdad@dnorte.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'responsable_igualdad', 'Fernando Gil', TRUE),

    ('40000004-0000-0000-0000-000000000012', '40000004-0000-0000-0000-000000000001',
     'rrhh@dnorte.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'rrhh_legal', 'Teresa Navarro', TRUE),

    ('40000004-0000-0000-0000-000000000013', '40000004-0000-0000-0000-000000000001',
     'director@dnorte.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'direccion', 'Andrés Herrera', TRUE),

    ('40000004-0000-0000-0000-000000000014', '40000004-0000-0000-0000-000000000001',
     'inspector@dnorte.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'inspector', 'Pilar Castro', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ── Denuncia previa (resuelta, origen de la mediación) ────────
INSERT INTO empresa_d44444444.denuncias
    (id, tracking_code, modalidad, tipo_acoso, estado, gravedad_ia, ciphertext_b64, iv_b64,
     denunciante_id, instructor_id, created_at, updated_at)
VALUES (
    '40000004-0000-0000-1000-000000000001', 'NOR001GHI', 'identificada',
    'acoso_laboral', 'resuelta', 'media',
    'SW1wb3J0YW50ZTogZXN0ZSBlcyB1biBjaXBoZXJ0ZXh0IGRlIG11ZXN0cmE=',
    'aXZfc2FtcGxlX2RlbW8=',
    '40000004-0000-0000-0000-000000000010',
    '40000004-0000-0000-0000-000000000012',
    NOW() - INTERVAL '50 days', NOW() - INTERVAL '15 days'
) ON CONFLICT DO NOTHING;

-- ── Expediente cerrado ────────────────────────────────────────
INSERT INTO empresa_d44444444.expedientes
    (id, denuncia_id, referencia, estado, instructor_id, fecha_apertura, fecha_cierre, resolucion)
VALUES (
    '40000004-0000-0000-2000-000000000001',
    '40000004-0000-0000-1000-000000000001',
    'EXP-2026-001', 'resuelto',
    '40000004-0000-0000-0000-000000000012',
    NOW() - INTERVAL '48 days', NOW() - INTERVAL '15 days',
    'Se constatan conductas incompatibles con el protocolo de convivencia. Ambas partes han expresado su voluntad de participar en un proceso de mediación para la resolución definitiva del conflicto.'
) ON CONFLICT DO NOTHING;

-- ── Mediación: en proceso, consentimiento de ambas partes ─────
INSERT INTO empresa_d44444444.mediaciones
    (id, expediente_id, mediador_id, estado, created_at, updated_at)
VALUES (
    '40000004-0000-0000-4000-000000000001',
    '40000004-0000-0000-2000-000000000001',
    '40000004-0000-0000-0000-000000000011',
    'en_proceso',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'
) ON CONFLICT DO NOTHING;

-- ── Par de apoyo registrado (el trabajador con formación completa) ─
INSERT INTO empresa_d44444444.cursos
    (id, titulo, descripcion, tipo, duracion_min, obligatorio, activo)
VALUES
    ('c4000004-0000-0000-0000-000000000001',
     'Acoso laboral: identificación y prevención', 'Curso obligatorio.',
     'video', 55, TRUE, TRUE),
    ('c4000004-0000-0000-0000-000000000002',
     'Formación de pares de apoyo', 'Requisito para registrarse como par de apoyo (M8).',
     'video', 60, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Trabajadora con formación 100% (puede ser par de apoyo)
INSERT INTO empresa_d44444444.progreso_formacion
    (usuario_id, curso_id, porcentaje, completado, completado_at, puntuacion_quiz)
VALUES
    ('40000004-0000-0000-0000-000000000010', 'c4000004-0000-0000-0000-000000000001', 100, TRUE, NOW() - INTERVAL '30 days', 90),
    ('40000004-0000-0000-0000-000000000010', 'c4000004-0000-0000-0000-000000000002', 100, TRUE, NOW() - INTERVAL '25 days', 88)
ON CONFLICT (usuario_id, curso_id) DO NOTHING;

INSERT INTO empresa_d44444444.certificados
    (usuario_id, curso_id, codigo_verificacion, emitido_at)
VALUES
    ('40000004-0000-0000-0000-000000000010', 'c4000004-0000-0000-0000-000000000001',
     'CERT-NOR-40000010', NOW() - INTERVAL '30 days'),
    ('40000004-0000-0000-0000-000000000010', 'c4000004-0000-0000-0000-000000000002',
     'CERT-NOR-40000010B', NOW() - INTERVAL '25 days')
ON CONFLICT DO NOTHING;

-- Par de apoyo registrado (requisito: formación completada)
INSERT INTO empresa_d44444444.pares_apoyo
    (id, usuario_id, formacion_completada, activo)
VALUES (
    '40000004-0000-0000-5000-000000000001',
    '40000004-0000-0000-0000-000000000010',
    TRUE, TRUE
) ON CONFLICT DO NOTHING;

-- ── Represalia registrada (E2E cifrada) ───────────────────────
-- La trabajadora reportó una represalia tras la denuncia (cambio de turno forzado)
INSERT INTO empresa_d44444444.registros_represalia
    (id, denunciante_id, denuncia_id, descripcion_cifrada, iv_b64, estado)
VALUES (
    '40000004-0000-0000-6000-000000000001',
    '40000004-0000-0000-0000-000000000010',
    '40000004-0000-0000-1000-000000000001',
    'SW1wb3J0YW50ZTogZGVzY3JpcGNpw7NuIGNpZnJhZGEgZGUgcmVwcmVzYWxpYSBkZSBtdWVzdHJh',
    'aXZfc2FtcGxlX2RlbW8=',
    'investigando'
) ON CONFLICT DO NOTHING;

-- ── Clima laboral: encuesta activa con respuestas mixtas ──────
INSERT INTO empresa_d44444444.encuestas_clima
    (id, titulo, descripcion, activa, fecha_inicio, fecha_fin, dimensiones)
VALUES (
    '40000004-0000-0000-3000-000000000001',
    'Clima laboral Q2-2026',
    'Evaluación trimestral FPSICO/INSST',
    TRUE, NOW() - INTERVAL '5 days', NOW() + INTERVAL '9 days',
    '["autonomia","carga_trabajo","demandas_cognitivas","variedad_contenido","participacion","interes_compensacion","desempeño_rol","relaciones_apoyo"]'
) ON CONFLICT DO NOTHING;

-- Respuestas mixtas (zona de riesgo medio)
INSERT INTO empresa_d44444444.respuestas_clima
    (encuesta_id, respuestas, segmento, fecha)
SELECT
    '40000004-0000-0000-3000-000000000001',
    '{"autonomia":3,"carga_trabajo":3,"demandas_cognitivas":3,"variedad_contenido":3,"participacion":2,"interes_compensacion":3,"desempeño_rol":3,"relaciones_apoyo":3}',
    'Almacén Central', s.d
FROM generate_series(NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', '1 day'::interval) s(d);

INSERT INTO empresa_d44444444.respuestas_clima
    (encuesta_id, respuestas, segmento, fecha)
SELECT
    '40000004-0000-0000-3000-000000000001',
    '{"autonomia":4,"carga_trabajo":2,"demandas_cognitivas":2,"variedad_contenido":4,"participacion":3,"interes_compensacion":4,"desempeño_rol":4,"relaciones_apoyo":4}',
    'Administración', s.d
FROM generate_series(NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', '1 day'::interval) s(d);
