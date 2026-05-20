-- ============================================================
-- SEED S03 — TechStart Solutions SLU
-- ESCENARIO: Empresa nueva · Sin denuncias · Onboarding inicial
-- ⚠️  Solo para desarrollo/demo. Nunca en producción.
-- ============================================================
-- Contraseña de todos los usuarios: Demo1234!
-- ============================================================

\c safework_db;

-- ── Empresa ───────────────────────────────────────────────────
INSERT INTO public.empresas (id, cif, razon_social, schema_name, plan_id, dpo_email, num_empleados, sector)
VALUES ('30000003-0000-0000-0000-000000000001', 'C33333333', 'TechStart Solutions SLU',
        'empresa_c33333333', 'starter', 'dpo@techstart.es', 58, 'Tecnología')
ON CONFLICT (cif) DO NOTHING;

SELECT public.crear_schema_empresa('30000003-0000-0000-0000-000000000001', 'C33333333');

-- ── Usuarios (contraseña: Demo1234!) ─────────────────────────
INSERT INTO public.usuarios (id, empresa_id, email, password_hash, salt_b64, perfil, nombre, activo)
VALUES
    ('30000003-0000-0000-0000-000000000010', '30000003-0000-0000-0000-000000000001',
     'trabajador@techstart.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'trabajador', 'Álvaro Pérez', TRUE),

    ('30000003-0000-0000-0000-000000000011', '30000003-0000-0000-0000-000000000001',
     'igualdad@techstart.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'responsable_igualdad', 'Laura Jiménez', TRUE),

    ('30000003-0000-0000-0000-000000000012', '30000003-0000-0000-0000-000000000001',
     'rrhh@techstart.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'rrhh_legal', 'Miguel Sanz', TRUE),

    ('30000003-0000-0000-0000-000000000013', '30000003-0000-0000-0000-000000000001',
     'director@techstart.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'direccion', 'Sandra García', TRUE),

    ('30000003-0000-0000-0000-000000000014', '30000003-0000-0000-0000-000000000001',
     'inspector@techstart.es',
     '$2b$10$dcyzjvLYI9qNzS0gEmGj6uyKfmKO4gAh2kJQdY3JH1ztnBxbM4.Dq',
     'dGVzdHNhbHQ=', 'inspector', 'Jorge Molina', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ── Sin denuncias — empresa recién incorporada ─────────────────
-- (Tabla vacía deliberadamente para mostrar estado inicial)

-- ── Primera encuesta de clima (recién lanzada, sin respuestas) ─
INSERT INTO empresa_c33333333.encuestas_clima
    (id, titulo, descripcion, activa, fecha_inicio, fecha_fin, dimensiones)
VALUES (
    '30000003-0000-0000-3000-000000000001',
    'Diagnóstico inicial — Clima laboral',
    'Primera medición de factores psicosociales FPSICO/INSST en TechStart',
    TRUE, NOW(), NOW() + INTERVAL '14 days',
    '["autonomia","carga_trabajo","demandas_cognitivas","variedad_contenido","participacion","interes_compensacion","desempeño_rol","relaciones_apoyo"]'
) ON CONFLICT DO NOTHING;

-- ── Cursos: publicados pero nadie ha empezado ─────────────────
INSERT INTO empresa_c33333333.cursos
    (id, titulo, descripcion, tipo, duracion_min, obligatorio, activo)
VALUES
    ('c3000003-0000-0000-0000-000000000001',
     'Acoso laboral: identificación y prevención', 'Obligatorio para todos los empleados.',
     'video', 55, TRUE, TRUE),
    ('c3000003-0000-0000-0000-000000000002',
     'Marco legal: Ley 2/2023', 'Canal de denuncias y derechos del informante.',
     'documento', 45, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Progreso 0% para el trabajador y RRHH (acaban de ser dados de alta)
INSERT INTO empresa_c33333333.progreso_formacion
    (usuario_id, curso_id, porcentaje, completado)
VALUES
    ('30000003-0000-0000-0000-000000000010', 'c3000003-0000-0000-0000-000000000001', 0, FALSE),
    ('30000003-0000-0000-0000-000000000012', 'c3000003-0000-0000-0000-000000000001', 0, FALSE)
ON CONFLICT (usuario_id, curso_id) DO NOTHING;
