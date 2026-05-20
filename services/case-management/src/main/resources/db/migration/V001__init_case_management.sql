-- ============================================================
-- Flyway V001 — Case-Management: validación de schema existente
-- Las tablas las crea crear_schema_empresa() en PostgreSQL.
-- Flyway solo registra que el schema está listo para este servicio.
-- ============================================================

-- Verificar que las tablas críticas existen antes de arrancar el servicio
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema()
        AND table_name = 'expedientes'
    ) THEN
        RAISE EXCEPTION 'Tabla expedientes no encontrada en schema %. Ejecuta crear_schema_empresa() primero.', current_schema();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema()
        AND table_name = 'expediente_eventos'
    ) THEN
        RAISE EXCEPTION 'Tabla expediente_eventos no encontrada en schema %.', current_schema();
    END IF;
END $$;
