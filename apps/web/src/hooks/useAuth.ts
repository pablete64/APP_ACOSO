"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

// Permisos por perfil — espejo de shared-types
const PERMISOS: Record<string, Set<string>> = {
  trabajador: new Set([
    "denuncia:crear", "denuncia:seguimiento_propio",
    "asistente:usar", "formacion:ver", "formacion:completar",
    "contacto:solicitar_cita", "contacto:mensajear", "clima:responder",
  ]),
  responsable_igualdad: new Set([
    "denuncia:ver_todas", "denuncia:asignar", "denuncia:comentar",
    "expediente:crear", "expediente:ver", "expediente:gestionar", "expediente:exportar",
    "contacto:gestionar", "formacion:gestionar",
    "clima:ver_resultados", "clima:crear_encuesta",
    "reporte:ver_basico", "reporte:exportar",
    "usuario:invitar", "usuario:ver", "auditoria:ver", "mediacion:gestionar",
  ]),
  rrhh_legal: new Set([
    "denuncia:ver_todas", "denuncia:asignar",
    "expediente:crear", "expediente:ver", "expediente:gestionar",
    "expediente:firmar", "expediente:exportar",
    "usuario:gestionar", "usuario:invitar", "usuario:ver",
    "reporte:ver_completo", "reporte:exportar",
    "auditoria:ver", "auditoria:exportar", "plan_igualdad:gestionar",
  ]),
  direccion: new Set([
    "reporte:ver_completo", "reporte:exportar",
    "clima:ver_resultados", "clima:ver_historico",
    "formacion:ver_estadisticas", "plan_igualdad:ver",
  ]),
  inspector: new Set([
    "expediente:ver", "expediente:exportar",
    "denuncia:ver_resumen",
    "auditoria:ver", "auditoria:exportar", "reporte:ver_completo",
  ]),
};

export interface AuthUser {
  id: string;
  email: string;
  nombre: string | null;
  perfil: string;
  empresaId: string;
  tenantSchema: string;
  accessToken: string;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user: AuthUser | null = session
    ? {
        id:           session.user?.email ?? "",
        email:        session.user?.email ?? "",
        nombre:       session.user?.name ?? null,
        perfil:       (session as any).perfil ?? "",
        empresaId:    (session as any).empresaId ?? "",
        tenantSchema: (session as any).tenantSchema ?? "",
        accessToken:  (session as any).accessToken ?? "",
      }
    : null;

  const can = useCallback(
    (permiso: string): boolean => {
      if (!user) return false;
      return PERMISOS[user.perfil]?.has(permiso) ?? false;
    },
    [user]
  );

  const logout = useCallback(async () => {
    // Revocar refresh token en backend
    if (user?.accessToken) {
      await fetch("/api/auth/logout-backend", { method: "POST" }).catch(() => {});
    }
    await signOut({ callbackUrl: "/auth/login" });
  }, [user]);

  return {
    user,
    isLoading:       status === "loading",
    isAuthenticated: status === "authenticated",
    can,
    logout,
  };
}
