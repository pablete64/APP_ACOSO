/**
 * Next.js middleware — protección de rutas por perfil.
 * Redirige al login si no hay sesión.
 * Redirige a /403 si el perfil no tiene acceso al grupo de rutas.
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mapeo: grupo de rutas → perfiles autorizados
const ROUTE_PERFILES: Record<string, string[]> = {
  "/worker":    ["trabajador"],
  "/hr":        ["rrhh_legal"],
  "/equality":  ["responsable_igualdad"],
  "/direction": ["direccion"],
  "/inspector": ["inspector"],
};

export default auth(async (request: NextRequest & { auth: any }) => {
  const { pathname } = request.nextUrl;

  // Rutas públicas — sin restricción
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = request.auth;

  if (!session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const perfil: string = (session as any).perfil ?? "";

  // Verificar acceso al grupo de rutas
  for (const [prefix, allowed] of Object.entries(ROUTE_PERFILES)) {
    if (pathname.startsWith(prefix) && !allowed.includes(perfil)) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
