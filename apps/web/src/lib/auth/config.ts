/**
 * NextAuth v5 — configuración con credenciales custom (proxy al backend Python).
 * El backend valida email/password, emite JWT RS256 y devuelve perfil + tenant.
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "SafeWork AI",
      credentials: {
        email:     { label: "Email",      type: "email"    },
        password:  { label: "Contraseña", type: "password" },
        totp_code: { label: "Código MFA", type: "text"     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email:     credentials.email,
              password:  credentials.password,
              totp_code: credentials.totp_code ?? null,
            }),
            credentials: "include",
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id:           data.sub ?? credentials.email as string,
            email:        credentials.email as string,
            name:         data.nombre,
            accessToken:  data.access_token,
            perfil:       data.perfil,
            empresaId:    data.empresa_id,
            tenantSchema: data.tenant_schema,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken  = (user as any).accessToken;
        token.perfil       = (user as any).perfil;
        token.empresaId    = (user as any).empresaId;
        token.tenantSchema = (user as any).tenantSchema;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).accessToken  = token.accessToken;
      (session as any).perfil       = token.perfil;
      (session as any).empresaId    = token.empresaId;
      (session as any).tenantSchema = token.tenantSchema;
      return session;
    },
  },

  pages: {
    signIn:  "/auth/login",
    error:   "/auth/login",
    signOut: "/auth/login",
  },

  session: {
    strategy: "jwt",
    maxAge:   15 * 60,  // 15 min — se refresca con el refresh token del backend
  },

  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "strict",
        path:     "/",
      },
    },
  },
};
