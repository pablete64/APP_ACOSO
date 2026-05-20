-- ============================================================
-- SafeWork AI — Seed de PRODUCCIÓN
-- SOLO datos de catálogo: planes y cursos base
-- Sin datos de empresa ni usuarios
-- ============================================================

\c safework_db;

-- Planes (idempotente — ON CONFLICT DO UPDATE para actualizaciones de precio)
INSERT INTO public.planes (id, nombre, max_usuarios, max_storage_gb, modulos, precio_mes_eur)
VALUES
    ('starter',      'Starter',      50,   5,   ARRAY['m1','m2','m3'],                              99.00),
    ('professional', 'Professional', 500,  50,  ARRAY['m1','m2','m3','m4','m5','m6','m7'],          299.00),
    ('enterprise',   'Enterprise',   NULL, 500, ARRAY['m1','m2','m3','m4','m5','m6','m7','m8'],     NULL)
ON CONFLICT (id) DO UPDATE SET
    nombre         = EXCLUDED.nombre,
    max_usuarios   = EXCLUDED.max_usuarios,
    max_storage_gb = EXCLUDED.max_storage_gb,
    modulos        = EXCLUDED.modulos,
    precio_mes_eur = EXCLUDED.precio_mes_eur;
