-- ============================================================
-- SafeWork AI — Script de inicialización del contenedor PostgreSQL
-- Ejecutado automáticamente al crear el contenedor por primera vez
-- ============================================================

\c safework_db;

-- Schema global + función crear_schema_empresa + función eliminar_schema_empresa
\i /docker-entrypoint-initdb.d/001_init.sql
