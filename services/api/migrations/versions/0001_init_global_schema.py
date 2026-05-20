"""Init: schema global público (empresas, usuarios, planes, audit)

Revision ID: 0001
Revises:
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Ejecutar el SQL canónico del schema global
    # El archivo 001_init.sql se aplica al arrancar el contenedor;
    # esta migración asegura que Alembic lo registre como aplicado.
    conn.execute(text("""
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    """))


def downgrade() -> None:
    # No se elimina el schema público en downgrade — operación destructiva manual
    pass
