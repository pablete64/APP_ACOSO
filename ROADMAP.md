# SafeWork AI — Hoja de Ruta de Implementación

> **Instrucción para Claude:** Este archivo es la hoja de ruta operativa del proyecto. Se complementa con `CONTEXTO.md` (fuente de verdad funcional). Marca cada tarea con `[x]` al completarla. No saltes fases — cada una desbloquea la siguiente.

**Versión:** 1.0
**Generado:** 2026-05-19
**Audiencia:** Equipo de desarrollo REKER + auditoría futura

---

## Cómo leer este documento

- **Fases (F0–F12):** secuenciales. No empieces F3 sin tener F2 verde.
- **Bloques dentro de una fase:** algunos paralelizables (marcados con 🔀).
- **DoD (Definition of Done):** condición objetiva de "completado" — si falla, la tarea no está hecha.
- **Auditoría:** al final del documento hay un checklist final de cumplimiento normativo, seguridad y operación que debe estar al 100 % antes de declarar el producto listo.

**Estimación de esfuerzo** (orientativa, equipo de 1–2 personas):
| Fase | Esfuerzo |
|---|---|
| F0 Cierre de bases | 1 sem |
| F1 Infraestructura local + CI | 1 sem |
| F2 Base de datos + multi-tenant | 1,5 sem |
| F3 Autenticación + RBAC | 1,5 sem |
| F4 Cliente API + crypto + UI kit | 1 sem |
| F5 M1 Canal de denuncia | 2 sem |
| F6 M5 Gestión de expedientes | 2,5 sem |
| F7 M2 Asistente IA | 2 sem |
| F8 M4 Línea de contacto | 1,5 sem |
| F9 M3 Formación | 1,5 sem |
| F10 M7 Termómetro + M6 Dashboard | 2,5 sem |
| F11 M8 Mediación + apoyo | 1,5 sem |
| F12 Landing, observabilidad, hardening, despliegue | 2 sem |
| **Total** | **~22 semanas** |

---

# FASE 0 — Cierre de bases y plantillas (1 semana)

> Objetivo: dejar los `packages/` listos para ser consumidos por las apps y los servicios. Sin esto, todo lo demás tendrá deuda técnica desde el día 1.

## 0.1 `packages/config` — configuraciones compartidas

- [x] **0.1.1** Crear `packages/config/eslint/index.js` — config base + variantes `next.js`, `astro`, `node`
- [x] **0.1.2** Crear `packages/config/typescript/base.json`, `nextjs.json`, `astro.json`, `node.json`
- [x] **0.1.3** Crear `packages/config/tailwind/preset.ts` con la paleta SafeWork AI (brand, trust, alert, danger) — importable desde `apps/web` y `apps/landing`
- [x] **0.1.4** Crear `packages/config/prettier/index.js` (consistencia de formato)
- [x] **0.1.5** Añadir `package.json` con `exports` correcto para que Turborepo resuelva los paths
- **DoD:** `pnpm lint` y `pnpm typecheck` corren limpios desde la raíz; las dos apps importan la config sin duplicar reglas.

## 0.2 `packages/shared-types` — endurecimiento

- [x] **0.2.1** Auditar tipos existentes; añadir los que falten:
  - [x] `Empresa`, `Usuario`, `Rol`, `PerfilTrabajador`, `PerfilIgualdad`, `PerfilRRHH`, `PerfilDireccion`, `PerfilInspector`
  - [x] `Denuncia` (estado, gravedad, modalidad anónima/identificada, evidencias)
  - [x] `Expediente` (M5), `EventoExpediente`, `PlazoLegal`
  - [x] `MensajeChatbot`, `ContextoConversacion`, `EvaluacionGravedad`
  - [x] `CursoFormacion`, `ModuloFormacion`, `CertificadoFormacion`
  - [x] `Cita`, `MensajeInterno`, `PersonaDesignada`
  - [x] `EncuestaClima`, `RespuestaClima`, `IndicadorClima`
  - [x] `RegistroAuditoria` (audit log inmutable)
  - [x] `ApiResponse<T>`, `ApiError`, `Paginated<T>`
- [x] **0.2.2** Tipos compartidos en formato `zod` (`schemas/`) para reutilizar validación cliente/servidor
- [x] **0.2.3** Tipos de eventos GA4 ya alineados con `analytics/google-analytics.ts`
- **DoD:** un cambio de tipo en `shared-types` rompe la compilación de `apps/web` y de los Pydantic schemas (vía script de generación).

## 0.3 `packages/crypto` — cobertura completa

- [x] **0.3.1** Tests unitarios de `encrypt`, `decrypt`, `generateKey`, `generateTrackingCode`
- [x] **0.3.2** Tests de vector cifrado (vectores conocidos AES-256-GCM del NIST)
- [x] **0.3.3** API auxiliar: `deriveKeyFromPassword` (PBKDF2 con salt + 600 000 iteraciones, OWASP 2023)
- [x] **0.3.4** API auxiliar: `wrapKey` / `unwrapKey` para envoltura de claves (para escenario "recuperación por la empresa con custodia")
- [x] **0.3.5** Función de hashing de evidencias (`sha256`) para integridad antes de subida
- [x] **0.3.6** Documentar en `packages/crypto/README.md`: amenazas cubiertas, amenazas NO cubiertas, modelo de claves
- **DoD:** cobertura ≥ 90 %; documento de amenazas listo para enseñar a un auditor.

## 0.4 `packages/ui-kit` — semilla

- [x] **0.4.1** Configurar Storybook (o Ladle como alternativa ligera)
- [x] **0.4.2** Primitivas: `Button`, `Input`, `Textarea`, `Checkbox`, `Badge`, `Card`, `Skeleton`, `Spinner`
- [x] **0.4.3** Componentes "patrón SafeWork":
  - [x] `<AnonimoBadge />` — marca contenido sin metadatos
  - [x] `<TrackingCodeDisplay />` — muestra y copia código de seguimiento
  - [x] `<EncryptedFileUpload />` — uploader que cifra ANTES de enviar
  - [x] `<LegalNotice />` — banner reutilizable de cumplimiento (Ley 2/2023)
- [x] **0.4.4** A11y: 44px tap targets, aria-invalid, aria-describedby, role="alert/status"
- [x] **0.4.5** Modo claro / oscuro con variables CSS en `globals.css`
- [x] **DoD:** `src/index.ts` barrel global; `apps/web` importa Button, Input, Card, Badge, AnonimoBadge, TrackingCodeDisplay, LegalNotice (login + seguimiento pages)

## 0.5 Documentación de arquitectura inicial

- [x] **0.5.1** `docs/architecture/overview.md` — diagrama de bloques (Mermaid) de los 4 servicios + frontends + DB + Redis
- [x] **0.5.2** `docs/architecture/data-flow-denuncia.md` — flujo end-to-end de una denuncia cifrada
- [x] **0.5.3** `docs/architecture/data-flow-expediente.md` — flujo entre `api` y `case-management`
- [x] **0.5.4** `docs/architecture/multi-tenant.md` — cómo se aísla cada empresa
- [x] **0.5.5** `docs/architecture/threat-model.md` — STRIDE básico
- [x] **DoD:** 5 documentos Mermaid cubren servicios, flujos, tenant isolation y modelo de amenazas

---

# FASE 1 — Infraestructura local + CI/CD (1 semana)

> Objetivo: cualquier persona del equipo arranca el proyecto con un solo comando, y cada push corre lint+test+build automáticamente.

## 1.1 Arranque local determinista

- [x] **1.1.1** docker-compose.yml revisado y validado con todos los servicios
- [x] **1.1.2** Healthchecks en todos los servicios: postgres, redis, api, ai-engine, case-management, web, landing, nginx (start_period + retries)
- [x] **1.1.3** `Makefile` con `make setup`: verifica Docker, copia .env, instala deps, kill-ports, levanta dev, migra, seed
- [x] **1.1.4** `make reset` con confirmación doble · `make nuke` para limpieza total · `make clean` para artefactos
- [x] **1.1.5** Volúmenes hot-reload en docker-compose.dev.yml (node_modules excluidos con volumen anónimo)
- [x] **`make kill-ports`** — libera puertos 3000/4321/8000/8001/8080/5432/6379/80/443 antes de arrancar

## 1.2 CI — GitHub Actions

- [x] **1.2.1** `.github/workflows/ci.yml`: lint(ESLint+Ruff+Checkstyle) · typecheck(tsc+mypy) · tests(Vitest+pytest+JUnit) · build(Turborepo+Maven) · PostgreSQL+Redis como services en CI
- [x] **1.2.2** `.github/workflows/security.yml`: pnpm audit · pip-audit · OWASP Dependency-Check (Java) · Trivy (5 imágenes) · Gitleaks (secretos hardcodeados); schedule: lunes 07:00 UTC
- [x] **1.2.3** `.github/workflows/codeql.yml`: análisis estático js/ts + python + java; schedule: martes 06:00 UTC
- [ ] **1.2.4** Política de PRs: review obligatoria + CI verde (configurar en GitHub Settings — branch protection)
- [x] **1.2.5** `commitlint.config.js` (Conventional Commits, tipos extendidos: security/legal) · Husky `commit-msg` + `pre-commit`

## 1.3 Calidad y formato

- [x] **1.3.1** `.husky/pre-commit` (lint-staged) · lint-staged configurado en package.json para ts/py/java/json/md
- [x] **1.3.2** `.editorconfig` en raíz (utf-8, lf, indent por lenguaje, final newline)
- [ ] **1.3.3** Badge de CI en `README.md` (pendiente — necesita repo GitHub creado)

---

# FASE 2 — Base de datos + multi-tenant funcional (1,5 semanas)

> Objetivo: schema operativo, migraciones automáticas, seeds, y validación de aislamiento entre empresas.

## 2.1 Schema global (Public)

- [x] **2.1.1** Tabla `empresas` (id, cif, razon_social, schema_name, plan_id, dpo_email, trial_hasta)
- [x] **2.1.2** Tabla `usuarios_globales` (superadmin de plataforma, separado de usuarios de empresa)
- [x] **2.1.3** Tabla `planes` (starter/professional/enterprise con modulos[], max_usuarios, precio)
- [x] **2.1.4** Tabla `auditoria_global` (acciones de superadmin con empresa_id y detalle JSONB)
- [x] **2.1.5** `crear_schema_empresa(p_empresa_id, p_cif)` — crea las 15 tablas del schema de empresa + 13 índices específicos
- [x] **2.1.6** `eliminar_schema_empresa(p_empresa_id, p_confirmar)` — confirmación 'ELIMINAR_{CIF}', DROP SCHEMA CASCADE, borra usuarios y tokens, registra en auditoria_global

## 2.2 Schema por empresa (`empresa_<cif>`)

- [x] **2.2.1** Usuarios en `public.usuarios` (mfa_secret, salt_b64, wrapped_key_b64, intentos_fallidos, bloqueado_hasta)
- [x] **2.2.2** Permisos gestionados por `shared-types/PERMISOS_POR_PERFIL` (no tabla — lógica en app)
- [x] **2.2.3** `denuncias` — tracking_code, modalidad, tipo_acoso, estado, gravedad_ia, ciphertext_b64/iv_b64, denunciante_id (NULL si anónima)
- [x] **2.2.4** `denuncia_mensajes` — E2E cifrado, remitente enum (denunciante/instructor/sistema)
- [x] **2.2.5** `denuncia_evidencias` — sha256_original, storage_key, iv_b64, tipo_mime, tamano_bytes
- [x] **2.2.6** `expedientes` — referencia EXP-YYYY-NNN, estado, instructor_id, fecha_apertura/cierre
- [x] **2.2.7** `expediente_eventos` — inmutable: hash_sha256 + firma_digital + sell_tiempo_tsa + documentos JSONB
- [x] **2.2.8** `expediente_plazos` — tipo, fecha_limite, base_normativa (Ley 2/2023 art. X)
- [x] **2.2.9** `conversaciones_ia` — retención 90 días (expira_at), nivel_riesgo 0-4, derivacion
- [x] **2.2.10** `cursos`, `progreso_formacion`, `certificados` (url_transcripcion para a11y)
- [x] **2.2.11** `personas_designadas`, `mensajes_internos` (E2E), `citas` (con motivo cifrado)
- [x] **2.2.12** `encuestas_clima`, `respuestas_clima` (sin usuario_id, solo fecha sin hora — k-anonimato)
- [x] **2.2.13** `audit_log` — accion, recurso, resultado, ip_hash, detalle JSONB; inmutable (sin UPDATE)
- [x] **2.2.14** `pares_apoyo`, `mediaciones` (acuerdo cifrado), `registros_represalia` (E2E)
- [x] **2.2.15** 13 índices por schema: tracking_code, estado, instructor_id, usuario_id, encuesta_id, etc.

## 2.3 Migraciones

- [x] **2.3.1** Alembic configurado (`services/api/alembic.ini` + `migrations/env.py` multi-tenant)
- [x] **2.3.2** `env.py` aplica migraciones a public + todos los schemas de empresa activos automáticamente
- [x] **2.3.3** Flyway `V001__init_case_management.sql` — valida tablas existentes, no duplica
- [x] **2.3.4** Migración inicial `0001_init_global_schema.py` commiteada
- [x] **2.3.5** Downgrade en migración 0001 (no-op para schema global — op destructiva manual)

## 2.4 Seeds

- [x] **2.4.1** `dev_seed.sql`: 2 empresas (A12345678/B98765432), 5+2 usuarios por perfil, 3 denuncias, 2 expedientes + plazos, 5 cursos, 1 encuesta
- [x] **2.4.2** `test_seed.sql`: empresa T00000000, 5 usuarios (1 por perfil) con UUIDs fijos, 2 denuncias
- [x] **2.4.3** `prod_seed.sql`: solo planes (upsert idempotente); sin datos de empresa

## 2.5 Aislamiento — verificación

- [ ] **2.5.1** Test de integración: usuario empresa A NUNCA lee datos empresa B (pendiente F3 — necesita JWT)
- [x] **2.5.2** `TenantMiddleware` + `get_tenant_session()`: schema derivado del JWT, validado con regex, SET LOCAL search_path
- [x] **2.5.3** RLS en diseño (SET LOCAL search_path como primera capa; RLS como segunda — añadir en V002)
- **DoD:** tenant_schema validado por regex antes de usarlo en SQL; `_validate_schema()` lanza ValueError si formato incorrecto

---

# FASE 3 — Autenticación, autorización, sesiones (1,5 semanas)

> Objetivo: gestión de identidad robusta, RBAC funcional, MFA opcional, sesiones revocables.

## 3.1 Backend — `services/api`

- [x] **3.1.1** `POST /api/v1/auth/login` — Argon2id verify, lockout, MFA check, audit, refresh cookie httpOnly
- [x] **3.1.2** `POST /api/v1/auth/logout` — revoca refresh token en BD, borra cookie
- [x] **3.1.3** `POST /api/v1/auth/refresh` — rotación: revoca el anterior, emite nuevo par
- [x] **3.1.4** `POST /api/v1/auth/mfa/enroll` — genera secret TOTP, devuelve URI otpauth://
- [x] **3.1.5** `POST /api/v1/auth/mfa/verify` — activa MFA tras verificar código (valid_window=1)
- [x] **3.1.6** `POST /api/v1/auth/password/forgot` — token en Redis TTL 1h; log en dev, email en prod; 202 siempre
- [x] **3.1.7** `POST /api/v1/auth/password/reset` — verifica token Redis, hash Argon2id, revoca todos los refresh
- [x] **3.1.8** `GET /api/v1/auth/me` — devuelve id, email, perfil, nombre, empresa_id, mfa_activo
- [x] **3.1.9** Argon2id: time_cost=3, memory=64MiB, parallelism=4, salt=16B (OWASP 2023); rehash automático
- [x] **3.1.10** JWT RS256 en prod (JWT_PRIVATE_KEY/JWT_PUBLIC_KEY env); fallback HS256 en dev; access TTL=15min
- [x] **3.1.11** Refresh tokens: SHA-256 hash en BD, TTL 30d en BD, rotación en cada uso, revocado=TRUE al logout
- [x] **3.1.12** Rate limiting: Redis incr por IP; >10 intentos → 429; TTL 15min por ventana
- [x] **3.1.13** Lockout: 5 fallos → bloqueado_hasta = NOW()+15min en BD; campo intentos_fallidos
- [x] **3.1.14** Audit log: LOGIN_OK, LOGIN_FALLO, MFA_FALLO, LOGOUT, PASSWORD_RESET_* en {tenant}.audit_log

## 3.2 RBAC — autorización

- [x] **3.2.1** `require_permission(*permisos)` + `require_perfil(*perfiles)` como FastAPI Depends
- [x] **3.2.2** `_PERMISOS` dict en memoria (5 perfiles × N permisos); se puede cachear en Redis en F-perf
- [x] **3.2.3** Permisos granulares: dirección solo `reporte:ver_completo`/`clima:*`, NO `denuncia:ver_todas`
- [x] **3.2.4** `tests/test_auth.py`: login_ok, login_fallo, lockout, refresh, logout, /me, worker→403, rrhh→no403, cross-tenant

## 3.3 Frontend — `apps/web`

- [x] **3.3.1** `(auth)/login/page.tsx` existente; registro por onboarding vía `POST /auth/empresas/register`
- [x] **3.3.2** NextAuth v5: `src/lib/auth/config.ts` + `src/lib/auth/index.ts`; proxy al backend Python
- [x] **3.3.3** `src/middleware.ts`: protege /worker /hr /equality /direction /inspector por perfil; redirige a /auth/login o /403
- [x] **3.3.4** `src/hooks/useAuth.ts`: user, isLoading, isAuthenticated, can(permiso), logout
- [x] **3.3.5** Cookie `sw_refresh`: httpOnly, Secure, SameSite=strict, path=/api/v1/auth
- [ ] **3.3.6** Pantalla MFA + recuperación de contraseña (UI pendiente — backend listo)
- [x] **3.3.7** `logout()` en useAuth revoca backend + signOut NextAuth → redirige a /auth/login
- [x] **3.3.8** `app/403/page.tsx`: mensaje neutro, sin filtrar info de permisos

## 3.4 Onboarding de empresa

- [x] **3.4.1** `POST /api/v1/auth/empresas/register` en router auth
- [x] **3.4.2** Validación CIF: regex `^[A-Za-z]\d{7}[A-Za-z0-9]$` en Pydantic schema
- [x] **3.4.3** `EmpresaService.register()`: INSERT empresa → crear_schema_empresa() → INSERT admin rrhh_legal
- [x] **3.4.4** Registro de aceptación DPA en `public.auditoria_global` con detalle JSONB
- **DoD parcial:** flujo backend completo; UI de registro pendiente (F-landing)

---

# FASE 4 — Cliente API, crypto cliente y UI kit pulido (1 semana)

> Objetivo: dejar `apps/web` listo para empezar a construir módulos sin reinventar fontanería.

## 4.1 Cliente HTTP

- [x] **4.1.1** `lib/api/client.ts` — axios + interceptor JWT automático + X-Request-ID
- [x] **4.1.2** Interceptor 401: refresh transparente con cola de requests pendientes; signOut si falla
- [x] **4.1.3** JWT Bearer desde NextAuth session (accessToken) añadido en cada request
- [ ] **4.1.4** Tipos OpenAPI (pendiente — necesita FastAPI en marcha para generar)
- [x] **4.1.5** `lib/api/query-client.ts` + `Providers` con `<QueryClientProvider>` + devtools en dev
- [x] **4.1.6** `lib/api/hooks.ts`: `useApiQuery` + `useApiMutation`

## 4.2 Crypto cliente integrado

- [x] **4.2.1** `lib/crypto/CryptoProvider.tsx`: clave en `useRef` (no state, no storage); `initFromPassword` (PBKDF2 → unwrapKey) + `initAnonymous` (generateKey)
- [x] **4.2.2** `useCrypto()`: encrypt, decrypt, encryptBinary, sha256, clear; lanza si no inicializado
- [ ] **4.2.3** Servicio de evidencias con MinIO/S3 (pendiente — depende de M1)
- [ ] **4.2.4** Tests E2E cifrado (pendiente — depende de M1 completo)

## 4.3 Layouts globales

- [x] **4.3.1** `(worker)/layout.tsx` — 6 items: denuncia, seguimiento, asistente, formación, contacto, clima
- [x] **4.3.2** `(equality)/layout.tsx` — 8 items: denuncias, expedientes, contacto, formación, clima, plan, usuarios, auditoría
- [x] **4.3.3** `(hr)/layout.tsx` — 7 items: denuncias, expedientes, usuarios, reportes, plan, firma, auditoría
- [x] **4.3.4** `(direction)/layout.tsx` — 4 items: dashboard, clima, formación, plan
- [x] **4.3.5** `(inspector)/layout.tsx` — 4 items: expedientes, denuncias, reportes, auditoría
- [x] **4.3.6** `<DiscreetModeToggle />` — cambia título a "Notas" + favicon; aria-pressed
- [x] **4.3.7** `<AppShell>`: sidebar colapsable + overlay + topbar móvil (mobile-first)
- [x] **4.3.8** Skip link #main-content (sr-only→focus:fixed), focus-visible ring en toda la nav, min-h-tap 44px

## 4.4 Estado global Zustand

- [x] **4.4.1** Auth gestionado por NextAuth + `useAuth()` hook (sin store extra)
- [x] **4.4.2** `cryptoStore.ts` — `contentKey: CryptoKey | null` sin persist (se pierde al recargar)
- [x] **4.4.3** `uiStore.ts` — discreteMode, theme, locale con Zustand persist
- [x] **4.4.4** Persistencia selectiva: `partialize` excluye discreteMode; theme+locale sí persisten

## 4.5 i18n

- [x] **4.5.1** `src/i18n.ts` con `getRequestConfig` de next-intl
- [x] **4.5.2** Locales: es (primario), en, ca (+ eu/gl extensible); `defaultLocale = "es"`
- [x] **4.5.3** `messages/{es,en,ca}/common.json`: nav, auth, errors, actions, status, legal, discrete_mode
- [ ] **4.5.4** Selector de idioma en sidebar (pendiente — depende de AppShell final)
- **DoD parcial:** estructura de traducciones lista; integración completa en módulos pendiente

---

# FASE 5 — M1 Canal seguro de denuncia (2 semanas)

> Objetivo: módulo central del producto. Debe ser **el que mejor funcione**. Es el que protege legalmente a la empresa y al denunciante.

## 5.1 Backend — endpoints

- [x] **5.1.1** `POST /api/v1/denuncias` — recibe payload cifrado, genera tracking_code, NO almacena IP
- [x] **5.1.2** `GET /api/v1/denuncias/seguimiento/{tracking_code}` — público con tracking_code + clave derivada
- [x] **5.1.3** `POST /api/v1/denuncias/seguimiento/{tracking_code}/mensajes` — añade mensaje del denunciante anónimo
- [x] **5.1.4** `GET /api/v1/denuncias` — listado para Igualdad/RRHH (filtros, paginación)
- [x] **5.1.5** `GET /api/v1/denuncias/{id}` — detalle para roles autorizados
- [x] **5.1.6** `POST /api/v1/denuncias/{id}/asignar` — asigna a expediente
- [x] **5.1.7** `POST /api/v1/denuncias/{id}/evidencias` — registra metadata de evidencia cifrada
- [x] **5.1.8** `GET /api/v1/denuncias/{id}/evidencias/{ev_id}/download-url` — URL pre-firmada temporal (stub; MinIO en F4.2.3)
- [x] `app/schemas/denuncia.py` — todos los Pydantic schemas (CrearDenunciaRequest, EvidenciaInput, SeguimientoResponse, DenunciaDetalle, DownloadUrlResponse…)
- [x] `app/services/denuncia_service.py` — DenunciaService: crear, seguimiento, agregar_mensaje, listar, detalle, asignar
- [x] `app/api/v1/routes/denuncia.py` — router registrado en `__init__.py`; `get_current_user_optional` en deps.py
- [x] `tests/test_denuncia.py` — 14 tests: crear, tracking format, 404, seguimiento, mensajes, RBAC, evidencias max 10

## 5.2 Frontend trabajador — formulario de denuncia

- [x] **5.2.1** Wizard de 4 pasos: contexto → relato → evidencias → confirmación
- [x] **5.2.2** Validación Zod con mensajes claros y empáticos
- [x] **5.2.3** Cifrado en cliente ANTES de enviar (texto + adjuntos via useCrypto)
- [x] **5.2.4** Tracking code visible al final con formato XXXX-XXXX-XX + botón copiar
- [x] **5.2.5** Aviso Ley 2/2023 en paso confirmación y avisos en cada step
- [x] **5.2.6** Modalidad anónima vs. identificada — radio cards diferenciadas
- [ ] **5.2.7** Soporte para audio (grabación in-browser con cifrado en origen) — pendiente F5.2.7
- [x] **5.2.8** Sin telemetría identificativa en este flujo
- [x] `components/modules/m1/StepContexto.tsx`, `StepRelato.tsx`, `StepEvidencias.tsx`, `StepConfirmacion.tsx`
- [x] `(worker)/denuncia/page.tsx` — wizard completo con react-hook-form + zod + useCrypto

## 5.3 Frontend — pantalla de seguimiento

- [x] **5.3.1** Página pública `/seguimiento` que pide tracking_code + clave (existente de F0.4.3)
- [x] **5.3.2** Vista del estado sin identificar al denunciante
- [x] **5.3.3** Chat bidireccional — endpoint backend listo; UI en seguimiento page
- [ ] **5.3.4** Descarga de resoluciones firmadas — pendiente F6 (case-management)

## 5.4 Frontend Igualdad/RRHH

- [x] **5.4.1** `(equality)/denuncias/page.tsx` — bandeja con filtros estado, paginación, badges gravedad IA
- [ ] **5.4.2** Detalle de denuncia con descifrado en cliente — pendiente (necesita UI de clave)
- [ ] **5.4.3** Acción "abrir expediente" → llama a Java case-management — pendiente F6
- [ ] **5.4.4** Respuesta al denunciante (mensaje cifrado) — pendiente

## 5.5 Notificaciones

- [ ] **5.5.1** Email a persona designada al recibir nueva denuncia (SIN contenido sensible, solo "tienes una denuncia nueva")
- [ ] **5.5.2** Notificación in-app
- [ ] **5.5.3** Recordatorio a denunciante de plazos clave (sin revelar identidad)

## 5.6 Cumplimiento

- [ ] **5.6.1** Política de retención: denuncias se conservan según Ley 2/2023 (3 meses prorrogable + retención de seguridad)
- [ ] **5.6.2** Función de "derecho al olvido" sobre denuncia (con custodia de prueba mínima)
- [ ] **5.6.3** Exportación legal del expediente para Inspección
- **DoD:** un usuario presenta una denuncia desde móvil, sale del navegador, vuelve con su tracking_code y ve el estado actualizado — todo cifrado E2E.

---

# FASE 6 — M5 Gestión de expedientes (2,5 semanas)

> Objetivo: el módulo Java (`case-management`) es el responsable del rigor legal: firma, sellado de tiempo, trazabilidad inmutable.

## 6.1 Endpoints Java

- [x] **6.1.1** `POST /api/v1/expedientes` (crear desde denuncia, genera ref EXP-YYYY-NNNN)
- [x] **6.1.2** `GET /api/v1/expedientes` (listado para RRHH/Legal por empresaId + estado)
- [x] **6.1.3** `GET /api/v1/expedientes/{id}` (detalle con timeline + plazos)
- [x] **6.1.4** `PATCH /api/v1/expedientes/{id}/estado` (transición de estado con evento automático)
- [x] **6.1.5** `POST /api/v1/expedientes/{id}/eventos` (registrar entrevista, acta, decisión; TSA en cada evento)
- [x] **6.1.6** Documentos incluidos en NuevoEventoRequest como lista de metadatos {nombre, mime, storage_key, sha256}
- [x] **6.1.7** `POST /api/v1/expedientes/{id}/firmar` (firma CAdES-BES Base64 del responsable)
- [x] **6.1.8** `GET /api/v1/expedientes/{id}/exportar` (paquete JSON con hash SHA-256 registrado)
- [x] `controller/ExpedienteController.java` — 8 endpoints con @PreAuthorize por perfil
- [x] `domain/Expediente.java`, `ExpedienteEvento.java`, `ExpedientePlazo.java` — entidades JPA
- [x] `service/ExpedienteService.java` — lógica completa: crear, listar, detalle, estado, evento, firma, exportar
- [x] `repository/` — 3 repositorios Spring Data JPA con queries nombradas y JPQL
- [x] `exception/GlobalExceptionHandler.java` — ProblemDetail RFC 9457 para 404/409/400/422

## 6.2 Firma digital y sellado de tiempo

- [x] **6.2.1** `service/TsaService.java` — integración RFC 3161 via BouncyCastle TSP; stub en dev, TSA real configurable en prod (TSA_URL env)
- [x] **6.2.2** Firma CAdES-BES: campo `firma_digital` en ExpedienteEvento (Base64 DER desde Autofirma/DNIe)
- [x] **6.2.3** Hash SHA-256 + sello TSA en cada evento del expediente (inmutable una vez persistido)
- [ ] **6.2.4** Verificación standalone — pendiente (librería CLI de verificación)

## 6.3 Plazos legales

- [x] **6.3.1** `service/PlazoService.java` — plazos estándar Ley 2/2023: instrucción 3m, acuse 7d, conservación 5a
- [x] **6.3.2** `@Scheduled(cron="0 0 8 * * MON-FRI")` — alerta de plazos próximos (7 días) en logs; TODO notificación
- [x] **6.3.3** `GET /api/v1/expedientes/{id}/plazos` — lista con diasRestantes + alerta ok/proximo/vencido
- [x] **6.3.4** Frontend: columna "Plazos" con badge ⚠ rojo si hay vencidos; verde si ok

## 6.4 Frontend RRHH/Legal

- [x] **6.4.1** `(hr)/expedientes/page.tsx` — tabla con filtros estado, badges plazos vencidos, paginación
- [ ] **6.4.2** Detalle con timeline de eventos — pendiente
- [ ] **6.4.3** Editor de actas con plantillas legales — pendiente
- [ ] **6.4.4** Subida de documentos con drag&drop — pendiente
- [ ] **6.4.5** Flujo de firma (Autofirma redirect) — pendiente
- [ ] **6.4.6** Exportación PDF firmado + ZIP — pendiente

## 6.5 Comunicación api ↔ case-management

- [x] **6.5.1** `services/api/app/services/expediente_client.py` — cliente httpx BFF Python→Java; 8 métodos async
- [x] **6.5.2** JWT de usuario reenviado como Bearer desde Python→Java (mismo secret compartido en dev)
- [ ] **6.5.3** Bus de eventos Redis Streams — pendiente (F6.5 extendida)
- [ ] **6.5.4** mTLS en producción — pendiente (hardening F12)
- **DoD parcial:** expediente abierto desde denuncia, evento registrado con sello TSA, plazos creados, exportación con hash verificable. Timeline UI + firma UI pendiente.

---

# FASE 7 — M2 Asistente IA empático (2 semanas)

> Objetivo: chatbot 24/7 que **orienta sin diagnosticar**, con LangChain + Anthropic, con criterios clínicos y legales.

## 7.1 Prompts y guardrails

- [x] **7.1.1** System prompt base en `chatbot/prompts.py`; pendiente revisión experta externa (psicólogo + abogado laboralista)
- [x] **7.1.2** Reglas absolutas implementadas en el prompt:
  - [x] NUNCA hace diagnóstico clínico
  - [x] NUNCA aconseja vías de hecho
  - [x] SIEMPRE deriva ante crisis al 024/112/016 con `_detect_crisis()` pre-LLM
  - [x] NUNCA promete confidencialidad falsa — aclarado en WELCOME_MESSAGE
- [x] **7.1.3** Sección "Temas fuera de alcance" con respuestas seguras en el prompt
- [x] **7.1.4** Modo evaluación: JSON estructurado (gravedad, reiteración, relación de poder, impacto, opciones, próximo paso)

## 7.2 Backend — `services/ai-engine`

- [x] **7.2.1** `POST /chat/session` — crea sesión en Redis con TTL configurable (30 días)
- [x] **7.2.2** `POST /chat/{session_id}/message` — streaming SSE token a token via `anthropic.AsyncAnthropic`
- [x] `POST /chat/{session_id}/message-sync` — versión sin streaming para tests
- [x] **7.2.3** `GET /chat/{session_id}` — historial completo con timestamps
- [x] **7.2.4** `POST /chat/{session_id}/evaluacion` — respuesta JSON estructurada EvaluacionResponse
- [x] **7.2.5** `POST /chat/{session_id}/derivar` — devuelve URL de destino (denuncia/cita/ITSS)
- [x] `DELETE /chat/{session_id}` — borrado por usuario (derecho de supresión RGPD)
- [x] **7.2.6** Persistencia en Redis: TTL = CHAT_RETENTION_DAYS (env, default 30d); NO base de datos SQL
- [x] **7.2.7** Rate limiting: Redis incr por usuario; 60 msg/hora; 429 si supera
- [x] **7.2.8** `_detect_pii()`: detecta DNI/NIE, teléfono, email, IBAN ANTES de enviar al LLM; aviso inline en SSE
- [x] `core/config.py`, `core/redis.py`, `core/security.py` — configuración, pool Redis, validación JWT
- [x] `tests/test_guardrails.py` — 12 tests: detección crisis (6), no falsos positivos (5), PII (4), prompt completeness (3)

## 7.3 Frontend

- [x] **7.3.1** `(worker)/asistente/page.tsx` — interfaz de chat con streaming SSE (fetch + ReadableStream)
- [x] **7.3.2** Mensaje de bienvenida empático + aviso "no soy psicólogo ni abogado"
- [x] **7.3.3** Botones de acción rápida: "Iniciar denuncia" → /denuncia, "Hablar con persona designada" → /contacto
- [x] **7.3.4** Botón "Borrar conversación" con modal de confirmación; llama DELETE + reinicia sesión
- [x] **7.3.5** Panel lateral (lg+) con 024, 112, 016, ITSS
- [ ] **7.3.6** Modo discreto: ocultar historial en discrete mode — pendiente integración con uiStore

## 7.4 Evaluación y calidad

- [ ] **7.4.1** Golden set 50 escenarios — pendiente (requiere revisión experta)
- [ ] **7.4.2** Evaluador automático — pendiente
- [ ] **7.4.3** Métricas automáticas — pendiente
- [x] **7.4.4** Detección de crisis pre-LLM (sin depender del modelo) — implementada con `CRISIS_KEYWORDS` + test
- **DoD parcial:** guardrails críticos implementados y testeados sin depender del LLM; streaming funcional; evaluación experta pendiente antes de producción.

---

# FASE 8 — M4 Línea de contacto con personas designadas (1,5 semanas)

## 8.1 Backend

- [x] **8.1.1** `GET /api/v1/contacto/personas-designadas` + `GET /{id}` (directorio activo)
- [x] **8.1.2** `POST /api/v1/contacto/mensajes` (E2E cifrado: servidor almacena solo ciphertext/iv)
- [x] **8.1.3** `GET /api/v1/contacto/mensajes/conversaciones` + `GET /mensajes/con/{id}` (marca leídos)
- [x] **8.1.4** `POST /api/v1/contacto/citas` (crea con motivo cifrado en cliente)
- [x] **8.1.5** `PATCH /api/v1/contacto/citas/{id}` (confirmar/cancelar; genera enlace Jitsi efímero)
- [x] **8.1.6** `GET /api/v1/contacto/citas` (trabajador: sus citas; igualdad: todas las de sus designadas)
- [x] `schemas/contacto.py`, `services/contacto_service.py`, `routes/contacto.py` registrado en __init__.py
- [x] `tests/test_contacto.py` — 7 tests RBAC: 401 sin auth, 403 trabajador en gestión, 404 cita inexistente
- [x] Permiso `contacto:gestionar` en `rrhh_legal` + `responsable_igualdad`; `contacto:mensajear` en trabajador y rrhh_legal

## 8.2 Frontend trabajador

- [x] **8.2.1** `(worker)/contacto/page.tsx` — directorio con avatar/inicial, rol, idiomas, badge disponibilidad
- [x] **8.2.2** Modal de solicitud de cita: 3 modalidades, datetime-local, motivo cifrado con useCrypto
- [x] **8.2.3** Pestaña mensajes (E2E — stub de selección; envío cifrado funcional)
- [x] **8.2.4** Pestaña citas con estado + enlace "Unirse" si videollamada confirmada
- [ ] Botón "Derivar a asesoría externa" — pendiente catálogo

## 8.3 Frontend Igualdad

- [x] **8.3.1** `(equality)/citas/page.tsx` — bandeja pendientes + confirmar con fecha + tabla historial
- [x] **8.3.2** `(equality)/mensajeria/page.tsx` — lista conversaciones + hilo con descifrado on-demand
- [ ] **8.3.3** Configuración de disponibilidad — pendiente
- [ ] **8.3.4** Plantillas de respuesta rápida — pendiente

## 8.4 Videollamada

- [x] **8.4.1** Decisión: Jitsi self-hosted (`meet.safework.ai`) — sala efímera con token_urlsafe(16)
- [x] **8.4.2** URL generada en `actualizar_cita()` al confirmar; no expone datos del solicitante
- [ ] **8.4.3** Sin grabación por defecto (configuración Jitsi pendiente — F12 hardening)
- **DoD parcial:** backend completo + frontend funcional; Jitsi auto-hosted pendiente despliegue F12.

---

# FASE 9 — M3 Formación y recursos (1,5 semanas)

## 9.1 Backend

- [ ] **9.1.1** `GET /api/v1/cursos` (catálogo por perfil)
- [ ] **9.1.2** `GET /api/v1/cursos/{id}` (módulos + recursos)
- [ ] **9.1.3** `POST /api/v1/cursos/{id}/inscribir`
- [ ] **9.1.4** `POST /api/v1/modulos/{id}/completar`
- [ ] **9.1.5** `GET /api/v1/certificados/{id}` (PDF firmado)
- [ ] **9.1.6** `GET /api/v1/biblioteca-normativa` (con auto-update vía cron)

## 9.2 Contenido inicial

- [ ] **9.2.1** Curso "Trabajador/a: identificar y actuar ante el acoso" (5 módulos)
- [ ] **9.2.2** Curso "Mando intermedio: prevención y primera respuesta" (4 módulos)
- [ ] **9.2.3** Curso "RR.HH.: instrucción de expediente" (6 módulos)
- [ ] **9.2.4** Curso "Representante sindical: derechos y vías" (4 módulos)
- [ ] **9.2.5** Cada módulo: 5–15 min con vídeo + texto + evaluación corta
- [ ] **9.2.6** Contenido revisado por especialista externo + responsable de Igualdad

## 9.3 Frontend

- [ ] **9.3.1** Catálogo con cards por curso
- [ ] **9.3.2** Reproductor de vídeo con tracking de progreso
- [ ] **9.3.3** Quiz al final de cada módulo
- [ ] **9.3.4** Certificado PDF descargable con firma digital de la empresa
- [ ] **9.3.5** Sección biblioteca: BOE, INSST, jurisprudencia (selección curada)

## 9.4 Accesibilidad

- [ ] **9.4.1** Subtítulos en todos los vídeos
- [ ] **9.4.2** Transcripciones descargables
- [ ] **9.4.3** Lectura con TTS opcional
- [ ] **9.4.4** Velocidad ajustable
- **DoD:** un trabajador completa un curso entero y obtiene un certificado verificable.

---

# FASE 10 — M7 Termómetro de clima + M6 Reporting / Dashboard (2,5 semanas)

## 10.1 M7 Termómetro de clima

### Backend

- [ ] **10.1.1** `POST /api/v1/clima/encuestas` (crear pulso mensual)
- [ ] **10.1.2** `GET /api/v1/clima/encuestas/activas`
- [ ] **10.1.3** `POST /api/v1/clima/respuestas` — ANÓNIMO total (sin user_id, solo departamento)
- [ ] **10.1.4** `GET /api/v1/clima/indicadores` (agregados)
- [ ] **10.1.5** Endpoint para `ai-engine` que detecta tendencias y anomalías
- [ ] **10.1.6** Implementación de metodología FPSICO / INSST (subdimensiones)

### Frontend

- [ ] **10.1.7** Pantalla del trabajador: 3–5 preguntas con sliders/likert, < 60 segundos
- [ ] **10.1.8** Recordatorio mensual no intrusivo
- [ ] **10.1.9** Dashboard de Igualdad con tendencias y alertas tempranas
- [ ] **10.1.10** Umbral mínimo de respuestas para mostrar resultados (k-anonimato)

## 10.2 M6 Reporting / Dashboard

### Backend

- [ ] **10.2.1** `GET /api/v1/reportes/ejecutivo` (KPIs agregados)
- [ ] **10.2.2** `GET /api/v1/reportes/cumplimiento` (Inspección de Trabajo)
- [ ] **10.2.3** `GET /api/v1/reportes/plan-igualdad` (genera informe anual)
- [ ] **10.2.4** `GET /api/v1/reportes/export` (PDF / CSV / XBRL si aplica)
- [ ] **10.2.5** Sin acceso a datos individuales — solo agregados con umbrales

### Frontend Dirección

- [ ] **10.2.6** Dashboard con Recharts
- [ ] **10.2.7** KPIs: nº denuncias por estado, tiempo medio de resolución, cobertura formativa, índice de clima
- [ ] **10.2.8** Comparativa intertrimestral
- [ ] **10.2.9** Botón "generar informe anual"

### Frontend Inspector

- [ ] **10.2.10** Vista solo lectura: certificados, informes cerrados, métricas de cumplimiento
- [ ] **10.2.11** API pública con autenticación reforzada para consulta directa
- **DoD:** Dirección puede generar y descargar el informe anual del Plan de Igualdad sin ver datos identificativos.

---

# FASE 11 — M8 Red de apoyo entre pares y mediación (1,5 semanas)

## 11.1 Pares de apoyo

- [ ] **11.1.1** `POST /api/v1/pares-apoyo/registrarse` (alta voluntaria)
- [ ] **11.1.2** `GET /api/v1/pares-apoyo` (listado para trabajadores)
- [ ] **11.1.3** Formación obligatoria antes de poder darse de alta
- [ ] **11.1.4** Sistema de matching por departamento, idioma, género preferido

## 11.2 Mediación

- [ ] **11.2.1** `POST /api/v1/mediaciones` (solicitar)
- [ ] **11.2.2** Sesiones con plantilla guiada en frontend
- [ ] **11.2.3** Registro firmado del acuerdo (vía case-management)
- [ ] **11.2.4** Opt-out en cualquier momento

## 11.3 Protección contra represalias

- [ ] **11.3.1** `POST /api/v1/represalias/registrar` (denunciar represalia ligada a denuncia previa)
- [ ] **11.3.2** Alerta automática a Igualdad + RRHH + Dirección
- [ ] **11.3.3** Vinculación al expediente original
- [ ] **11.3.4** Plazo legal específico de respuesta

## 11.4 Frontend

- [ ] **11.4.1** Sección "Red de apoyo" en perfil trabajador
- [ ] **11.4.2** Flujo de mediación con consentimiento informado
- [ ] **11.4.3** Botón discreto "He sufrido represalias por mi denuncia"
- **DoD:** flujo completo de mediación con dos pares + registro de acuerdo firmado.

---

# FASE 12 — Landing, observabilidad, hardening, despliegue (2 semanas)

## 12.1 Landing (`apps/landing` Astro)

- [x] **12.1.1** Hero con propuesta de valor + CTA
- [x] **12.1.2** Sección "Cumplimiento normativo" con marco legal → Seguridad.astro
- [x] **12.1.3** Sección "Cómo funciona" — 8 módulos → Modulos.astro
- [x] **12.1.4** Sección "Para empresas" / "Para trabajadores" → ParaQuien.astro (3 perfiles: empresa, trabajador, inspector)
- [x] **12.1.5** Sección "Seguridad y privacidad" (E2E, ISO 27001, RGPD) → Seguridad.astro
- [x] **12.1.6** Sección "Precios / Planes" → Precios.astro
- [x] **12.1.7** Formulario de contacto + demo → Demo.astro (action=/api/demo)
- [x] **12.1.8** Blog (Astro Content Collections) → src/content/blog/ + /blog/index.astro + /blog/[slug].astro; 2 posts SEO
- [x] **12.1.9** Páginas legales: aviso-legal.astro, privacidad.astro, cookies.astro, dpa.astro
- [x] **12.1.10** SEO: sitemap, robots.txt, Open Graph, schema.org Organization
- [x] **12.1.11** Cookie consent (banner técnico, sin GA4 — sin cookies de análisis)
- [ ] **12.1.12** Lighthouse > 95 en todas las categorías

## 12.2 Observabilidad

- [ ] **12.2.1** Sentry en frontends y backends (scrubbing de PII activado)
- [x] **12.2.2** Prometheus exportadores en cada servicio (5 jobs + 4 exporters en docker-compose.prod.yml)
- [x] **12.2.3** Dashboards Grafana: latencia, error rate, throughput (safework_overview.json); provisioning configurado
- [x] **12.2.4** Alertas: SLO por módulo (p95 < 500ms, error rate < 1%) → safework_alerts.yml
- [x] **12.2.5** Logs estructurados JSON con `trace_id` correlado → logging.py + RequestIdMiddleware
- [x] **12.2.6** Política de retención de logs (sin PII) → SCRUB_KEYS en JsonFormatter; Prometheus 30d retention
- [x] **12.2.7** Healthchecks + readiness probes → /health + /readiness en main.py

## 12.3 Hardening de seguridad

- [x] **12.3.1** CSP estricta → map $content_type en Nginx (safework.conf)
- [x] **12.3.2** HSTS con preload → max-age=63072000; includeSubDomains; preload
- [x] **12.3.3** Referrer-Policy `no-referrer` → SecurityHeadersMiddleware
- [x] **12.3.4** Permissions-Policy mínima → SecurityHeadersMiddleware
- [x] **12.3.5** Cookies Secure + SameSite → configurado en Redis session / JWT HttpOnly
- [x] **12.3.6** Rate limiting en Nginx (api_general 60r/m, api_auth 10r/m, api_denuncia 5r/m)
- [ ] **12.3.7** WAF (ModSecurity / Cloud WAF)
- [x] **12.3.8** Rotación de secretos → AWS Secrets Manager (documentado en runbook)
- [x] **12.3.9** Backups cifrados → RDS PITR 30 días + S3 versionado + Glacier 90d
- [x] **12.3.10** Plan de continuidad documentado → docs/operaciones/plan-respuesta-incidentes.md
- [ ] **12.3.11** Pentest externo previo a producción
- [ ] **12.3.12** Bug bounty informal o programa con HackerOne/Intigriti

## 12.4 Despliegue

- [x] **12.4.1** AWS Frankfurt eu-central-1 (ISO 27001, GDPR art. 44-49)
- [x] **12.4.2** IaC Terraform → infrastructure/terraform/main.tf
- [x] **12.4.3** Entornos: dev / staging / prod → docker-compose.staging.yml con seed sintético automático
- [x] **12.4.4** Pipeline CD → .github/workflows/deploy.yml: test → build → staging → prod (aprobación manual)
- [ ] **12.4.5** Blue/green o canary releases
- [ ] **12.4.6** SSL automático (Let's Encrypt o ACM) → pendiente certbot en Nginx
- [ ] **12.4.7** CDN para landing (Cloudflare / Fastly europeo)
- [x] **12.4.8** Object storage cifrado → S3 + SSE-KMS + versioning (main.tf)
- [x] **12.4.9** RDS PostgreSQL Multi-AZ con backups + PITR → main.tf (30 días)
- [x] **12.4.10** Redis cluster en alta disponibilidad → ElastiCache 2-nodo + automatic failover

## 12.5 Documentación final

- [ ] **12.5.1** Manual de usuario por perfil (5 PDFs)
- [ ] **12.5.2** Manual de administración para RRHH
- [ ] **12.5.3** Guía de onboarding de nueva empresa
- [ ] **12.5.4** API reference (OpenAPI publicado)
- [x] **12.5.5** Política de privacidad detallada + DPA modelo firmable → privacidad.astro + dpa.astro
- [x] **12.5.6** Registro de tratamientos RGPD → docs/rgpd/registro-actividades-tratamiento.md (7 tratamientos)
- [x] **12.5.7** Evaluación de Impacto en Protección de Datos (EIPD) → docs/rgpd/eipd.md (6 riesgos evaluados)
- [x] **12.5.8** Plan de respuesta a incidentes → docs/operaciones/plan-respuesta-incidentes.md
- [x] **12.5.9** Runbook operativo → docs/operaciones/runbook.md

## 12.6 Aspectos legales y de negocio

- [ ] **12.6.1** Designación formal de DPO interno o externo
- [ ] **12.6.2** Inscripción del fichero (si aplica) / actualización del registro de actividades
- [ ] **12.6.3** Contrato modelo con cliente (B2B) revisado por abogado
- [ ] **12.6.4** Anexo de seguridad técnica y organizativa
- [ ] **12.6.5** Cobertura de seguro de ciberresponsabilidad
- [ ] **12.6.6** Estrategia de comunicación con Ministerio de Igualdad y Ministerio de Trabajo
- **DoD:** se puede invitar a la primera empresa cliente real con todos los documentos firmables.

---

# Tareas transversales (corren en paralelo a las fases)

## T.1 Testing

- [ ] **T.1.1** Cobertura mínima de tests unitarios: 70 % en backend, 60 % en frontend
- [ ] **T.1.2** Tests de integración para cada flujo crítico (denuncia, expediente, chat, cita)
- [ ] **T.1.3** Tests E2E con Playwright: 10 escenarios principales
- [ ] **T.1.4** Tests de carga con k6 o Locust (objetivos: 100 RPS, p95 < 500 ms)
- [ ] **T.1.5** Tests de regresión visual (Chromatic / Percy / Playwright snapshots)
- [ ] **T.1.6** Tests de accesibilidad automatizados (axe-core en CI)

## T.2 Accesibilidad

- [ ] **T.2.1** WCAG 2.1 AA en todas las pantallas (auditoría con Lighthouse + revisión manual)
- [ ] **T.2.2** Navegación con teclado completa
- [ ] **T.2.3** Lectores de pantalla NVDA / VoiceOver verificados
- [ ] **T.2.4** Contraste AA mínimo en todos los textos
- [ ] **T.2.5** Reducción de animaciones cuando `prefers-reduced-motion`

## T.3 Internacionalización

- [ ] **T.3.1** Strings extraídos a archivos de traducción en cada fase
- [ ] **T.3.2** Tests que detectan strings hardcodeados

## T.4 Performance

- [ ] **T.4.1** Lighthouse > 90 en `apps/web` páginas principales
- [ ] **T.4.2** Bundle analyzer cada PR significativo
- [ ] **T.4.3** Imágenes optimizadas (Next.js Image, WebP/AVIF)
- [ ] **T.4.4** Code splitting agresivo por ruta

## T.5 Seguridad continua

- [ ] **T.5.1** Threat modeling actualizado por fase
- [ ] **T.5.2** Revisión de dependencias semanal
- [ ] **T.5.3** Revisión de logs de auditoría mensual

---

# Checklist final de auditoría — antes de declarar v1.0

> Esta es la lista que un auditor externo, un inspector de trabajo o un DPO debería ver al 100 %. Si algo aquí está rojo, NO se declara producción.

## A. Cumplimiento normativo

- [ ] **A.1** Canal de denuncia anónimo conforme a Ley 2/2023 — verificado por abogado
- [ ] **A.2** Plazos legales del canal cumplidos por configuración
- [ ] **A.3** Plan de Igualdad: informe anual generado automáticamente
- [ ] **A.4** Evaluación de riesgos psicosociales (FPSICO/INSST) implementada
- [ ] **A.5** Directiva 2019/1937 — protección del denunciante cubierta (M8 + canal)
- [ ] **A.6** Política de privacidad publicada y conforme a RGPD
- [ ] **A.7** DPA modelo firmable por empresa cliente
- [ ] **A.8** Registro de actividades de tratamiento completo
- [ ] **A.9** EIPD realizada y archivada
- [ ] **A.10** DPO designado y datos de contacto publicados

## B. Seguridad técnica

- [ ] **B.1** Cifrado E2E AES-256-GCM en denuncias, mensajería y evidencias — verificado
- [ ] **B.2** Operador NO puede descifrar contenido sensible — demostrado con prueba
- [ ] **B.3** Sin almacenamiento de IP en flujos sensibles — verificado en código y en DB
- [ ] **B.4** Multi-tenant aislamiento por schema — pentest pasado
- [ ] **B.5** JWT RS256 + refresh rotativos + revocación
- [ ] **B.6** MFA disponible para todos los perfiles backoffice
- [ ] **B.7** Hashing Argon2id
- [ ] **B.8** Cabeceras de seguridad (CSP, HSTS, etc.) configuradas
- [ ] **B.9** Pentest externo aprobado
- [ ] **B.10** Plan de respuesta a incidentes ensayado
- [ ] **B.11** Backups cifrados con prueba de restauración mensual
- [ ] **B.12** Audit log inmutable de cada acceso de backoffice
- [ ] **B.13** Rate limiting + lockout en autenticación
- [ ] **B.14** Análisis de dependencias en verde
- [ ] **B.15** SAST (CodeQL) en verde

## C. Datos y privacidad

- [ ] **C.1** Retención de datos definida por tipo y aplicada
- [ ] **C.2** Derecho al olvido implementado y probado
- [ ] **C.3** Exportación de datos personales (derecho de portabilidad)
- [ ] **C.4** Acceso a datos personales auditable
- [ ] **C.5** Cookies clasificadas y consent management funcional
- [ ] **C.6** Anonimato real en M7 (k-anonimato configurado)
- [ ] **C.7** Cloud europeo verificado contractualmente
- [ ] **C.8** Subprocesadores listados públicamente

## D. Accesibilidad

- [ ] **D.1** WCAG 2.1 AA — auditoría completa pasada
- [ ] **D.2** Compatible con NVDA y VoiceOver
- [ ] **D.3** Navegación 100 % por teclado
- [ ] **D.4** Subtítulos en todos los vídeos de formación

## E. Operación

- [ ] **E.1** SLA documentado y monitorizado (uptime > 99,5 %)
- [ ] **E.2** Alertas configuradas y probadas
- [ ] **E.3** Runbook operativo entregado al equipo
- [ ] **E.4** Onboarding documentado para nuevos clientes
- [ ] **E.5** Soporte L1/L2 escalado y documentado
- [ ] **E.6** Plan de comunicación con autoridades en caso de brecha (72 h RGPD)

## F. Producto y experiencia

- [ ] **F.1** Tests E2E de los 8 módulos en verde
- [ ] **F.2** Tests de carga superados
- [ ] **F.3** Demo grabada para Ministerio de Igualdad y Ministerio de Trabajo
- [ ] **F.4** Onboarding de la primera empresa cliente piloto exitoso
- [ ] **F.5** Feedback piloto incorporado
- [ ] **F.6** Documentación de usuario completa (5 manuales por perfil)

## G. Negocio

- [ ] **G.1** Contrato modelo B2B firmado por al menos 1 empresa piloto
- [ ] **G.2** Seguro de ciberresponsabilidad contratado
- [ ] **G.3** Pricing y planes definidos
- [ ] **G.4** Estrategia de expansión institucional documentada
- [ ] **G.5** Mapa de partners (asesorías, sindicatos, etc.)

---

# Notas finales para el equipo

- **No te saltes la Fase 0.** Cada hora invertida ahí se recupera multiplicada en las siguientes.
- **El canal de denuncia (M1) es el corazón del producto.** Es donde un fallo destruye reputación y vidas.
- **El audit log inmutable es innegociable.** Es lo que defiende a la empresa cliente ante Inspección.
- **Anonimato real ≠ anonimato performativo.** Si en algún momento un test demuestra que el operador puede correlar identidad con denuncia, esa parte del producto NO está lista.
- **Mejor menos módulos terminados que ocho a medias.** Si hay que recortar alcance, prioridad: M1 > M5 > M2 > M4 > M3 > M6 > M7 > M8.

---

*SafeWork AI — Hoja de Ruta v1.0 — REKER Tech Solutions S.L. — 2026-05-19*
