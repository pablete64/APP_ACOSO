"""Alta de empresa: crea schema, admin inicial y plantillas legales."""
from __future__ import annotations

import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, generate_totp_secret
from app.schemas.auth import EmpresaRegisterRequest


class EmpresaService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, data: EmpresaRegisterRequest) -> dict:
        # Verificar que el CIF no existe
        result = await self.db.execute(
            text("SELECT id FROM public.empresas WHERE cif=:cif"),
            {"cif": data.cif.upper()},
        )
        if result.first():
            raise ValueError(f"Ya existe una empresa con CIF {data.cif.upper()}")

        # Verificar que el email del admin no existe
        result = await self.db.execute(
            text("SELECT id FROM public.usuarios WHERE email=:email"),
            {"email": data.admin_email},
        )
        if result.first():
            raise ValueError("El email del administrador ya está registrado")

        empresa_id = uuid.uuid4()

        # 1. Insertar empresa
        await self.db.execute(
            text("""
                INSERT INTO public.empresas (id, cif, razon_social, schema_name, plan_id, dpo_email, num_empleados)
                VALUES (:id, :cif, :rs, 'pendiente', :plan, :dpo, :emp)
            """),
            {
                "id":   empresa_id,
                "cif":  data.cif.upper(),
                "rs":   data.razon_social,
                "plan": data.plan_id,
                "dpo":  str(data.dpo_email) if data.dpo_email else None,
                "emp":  data.num_empleados,
            },
        )

        # 2. Crear schema con todas las tablas (llama a la función PL/pgSQL)
        result = await self.db.execute(
            text("SELECT public.crear_schema_empresa(:id, :cif)"),
            {"id": empresa_id, "cif": data.cif.upper()},
        )
        schema_name = result.scalar()

        # 3. Crear usuario administrador (perfil rrhh_legal)
        import secrets as sec
        salt_b64 = sec.token_urlsafe(32)
        admin_id = uuid.uuid4()
        await self.db.execute(
            text("""
                INSERT INTO public.usuarios
                    (id, empresa_id, email, password_hash, salt_b64, perfil, nombre)
                VALUES (:id, :eid, :email, :hash, :salt, 'rrhh_legal', :nombre)
            """),
            {
                "id":     admin_id,
                "eid":    empresa_id,
                "email":  data.admin_email,
                "hash":   hash_password(data.admin_password),
                "salt":   salt_b64,
                "nombre": data.admin_nombre,
            },
        )

        # 4. Aceptación de DPA (registrada en audit_log global)
        await self.db.execute(
            text("""
                INSERT INTO public.auditoria_global (accion, empresa_id, detalle)
                VALUES ('EMPRESA_REGISTRADA', :eid, :det)
            """),
            {
                "eid": empresa_id,
                "det": f'{{"plan":"{data.plan_id}","cif":"{data.cif.upper()}","admin":"{data.admin_email}"}}',
            },
        )

        await self.db.commit()

        return {
            "empresa_id":  str(empresa_id),
            "schema_name": schema_name,
            "admin_id":    str(admin_id),
            "message":     f"Empresa registrada. Schema: {schema_name}",
        }
