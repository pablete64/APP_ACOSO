-- ============================================================
-- SafeWork AI — Seed de TESTS (dataset mínimo determinista)
-- Usado en CI: pytest + tests de integración
-- ============================================================

\c safework_db;

-- Empresa de test con UUID fijo (reproducibilidad)
INSERT INTO public.empresas (id, cif, razon_social, schema_name, plan_id, num_empleados)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'T00000000', 'Empresa Test S.L.', 'empresa_t00000000', 'professional', 10)
ON CONFLICT (cif) DO NOTHING;

SELECT public.crear_schema_empresa('ffffffff-ffff-ffff-ffff-ffffffffffff', 'T00000000');

-- Un usuario por cada perfil (IDs fijos para assertions en tests)
INSERT INTO public.usuarios (id, empresa_id, email, password_hash, salt_b64, perfil, nombre)
VALUES
    ('cccc0001-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'worker@test.es',    'hash_placeholder', 'salt_placeholder', 'trabajador',           'Test Worker'),
    ('cccc0002-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'igualdad@test.es',  'hash_placeholder', 'salt_placeholder', 'responsable_igualdad', 'Test Igualdad'),
    ('cccc0003-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'rrhh@test.es',      'hash_placeholder', 'salt_placeholder', 'rrhh_legal',           'Test RRHH'),
    ('cccc0004-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'director@test.es',  'hash_placeholder', 'salt_placeholder', 'direccion',            'Test Director'),
    ('cccc0005-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'inspector@test.es', 'hash_placeholder', 'salt_placeholder', 'inspector',            'Test Inspector')
ON CONFLICT (email) DO NOTHING;

-- Una denuncia anónima y una identificada
INSERT INTO empresa_t00000000.denuncias
    (id, tracking_code, modalidad, tipo_acoso, estado, ciphertext_b64, iv_b64)
VALUES
    ('dddd0001-0000-0000-0000-000000000000', 'TEST000001', 'anonima',      'acoso_laboral', 'recibida',    'dGVzdA==', 'aXY='),
    ('dddd0002-0000-0000-0000-000000000000', 'TEST000002', 'identificada', 'acoso_sexual',  'en_revision', 'dGVzdA==', 'aXY=')
ON CONFLICT DO NOTHING;
