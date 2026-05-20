# SafeWork AI — Documento de Contexto y Estado del Proyecto

> **Instrucción para Claude:** Este archivo es la fuente de verdad del proyecto. Léelo al inicio de cada conversación para saber dónde estamos, qué se ha hecho y qué decisiones técnicas se han tomado. Actualízalo cada vez que se complete una tarea relevante o se tome una decisión de arquitectura.

---

## Estado actual del proyecto

**Última actualización:** 2026-05-19
**Fase:** Estructura base creada — pendiente de desarrollar funcionalidad

### Progreso por área

| Área | Estado | Notas |
|---|---|---|
| Estructura de carpetas (monorepo) | ✅ Completado | Turborepo, todas las carpetas creadas |
| Configuración raíz | ✅ Completado | package.json, turbo.json, .gitignore, .env.example |
| Docker (dev + prod) | ✅ Completado | 3 docker-compose + Dockerfiles de cada servicio |
| apps/web (Next.js) | ✅ Estructura creada | package.json, next.config.js, tailwind, layout.tsx, globals.css, Google Analytics |
| apps/landing (Astro) | ✅ Estructura creada | package.json, astro.config.mjs, Dockerfile |
| services/api (Python FastAPI) | ✅ Estructura creada | main.py, config.py, router con 8 endpoints, requirements.txt, Dockerfile |
| services/ai-engine (Python) | ✅ Estructura creada | main.py, requirements.txt, Dockerfile |
| services/case-management (Java) | ✅ Estructura creada | pom.xml, application.yml, Dockerfile |
| database | ✅ Esquema base creado | schema multi-tenant SQL, función crear_schema_empresa, tablas M1/M2/M5/M7 |
| packages/shared-types | ✅ Completado | 9 archivos por dominio, schemas Zod (auth/denuncia/contacto/clima), tipos GA4, barrel index.ts |
| packages/crypto | ✅ Completado | AES-256-GCM, PBKDF2 (600k iter), wrapKey/unwrapKey, SHA-256+integridad, tracking codes; 40+ tests con vectores NIST; README con modelo de amenazas |
| packages/config | ✅ Completado | ESLint (base/nextjs/astro/node), TypeScript (4 configs), Tailwind preset, Prettier, package.json con exports |
| packages/ui-kit | ✅ Completado | Storybook 8 · 8 primitivos (Button/Input/Textarea/Badge/Card/Skeleton/Spinner/Checkbox) · 4 componentes SafeWork (AnonimoBadge/TrackingCodeDisplay/EncryptedFileUpload/LegalNotice) · barrel src/index.ts |
| Diseño UI / Componentes | ✅ Completado | apps/web importa 7+ componentes en login + seguimiento pages |
| Autenticación (NextAuth / JWT) | ⬜ Pendiente | |
| M1 — Canal de denuncia | ⬜ Pendiente | |
| M2 — Asistente IA | ⬜ Pendiente | |
| M3 — Formación | ⬜ Pendiente | |
| M4 — Línea de contacto | ⬜ Pendiente | |
| M5 — Gestión de expedientes | ⬜ Pendiente | |
| M6 — Reporting / Dashboard | ⬜ Pendiente | |
| M7 — Termómetro de clima | ⬜ Pendiente | |
| M8 — Mediación y apoyo entre pares | ⬜ Pendiente | |
| Landing page | ⬜ Pendiente | |
| Tests | ⬜ Pendiente | |
| CI/CD (.github/workflows) | ⬜ Pendiente | |

---

## Log de progreso

### 2026-05-19 — Sesión 10: Fase 4 completada — Cliente API + Crypto + Layouts + i18n
- `lib/api/client.ts`: axios con interceptor Bearer JWT (de NextAuth session), refresh transparente en 401 con cola de requests, X-Request-ID, signOut si refresh falla
- `lib/api/hooks.ts`: `useApiQuery` + `useApiMutation` sobre React Query; `lib/api/query-client.ts` con staleTime 1min
- `lib/crypto/CryptoProvider.tsx`: contentKey en `useRef` (no state/storage); initFromPassword (PBKDF2→AES-KW unwrap), initAnonymous (generateKey), encrypt/decrypt/encryptBinary/sha256, clear; `useCrypto()` hook
- `store/uiStore.ts`: Zustand persist (theme+locale); discreteMode sin persist; `store/cryptoStore.ts`: contentKey sin persist (seguridad)
- `components/layout/AppShell.tsx`: sidebar colapsable (fixed en móvil, static en lg), skip link #main-content sr-only→focus:fixed, overlay, topbar móvil, min-h-tap 44px en nav
- `components/layout/DiscreetModeToggle.tsx`: cambia document.title a "Notas" + favicon; aria-pressed
- Layouts de los 5 perfiles: `(worker)` (6 nav), `(equality)` (8 nav), `(hr)` (7 nav), `(direction)` (4 nav), `(inspector)` (4 nav)
- `app/providers.tsx`: SessionProvider + QueryClientProvider + CryptoProvider + ReactQueryDevtools (solo dev)
- `app/layout.tsx` actualizado para usar `<Providers>`
- `src/i18n.ts` + `messages/{es,en,ca}/common.json` (nav, auth, errors, actions, status, legal, discrete_mode)

### 2026-05-19 — Sesión 9: Fase 3 completada — Autenticación + RBAC + sesiones
- `app/core/security.py`: Argon2id (time=3, mem=64MiB, parallelism=4), JWT RS256/HS256, create_access_token (sub+tenant_schema+perfil+empresa_id), create/decode refresh tokens (SHA-256 hash), TOTP (pyotp, valid_window=1), generate_reset_token, sha256_ip para audit
- `app/core/deps.py`: CurrentUser dataclass, get_current_user (HTTPBearer → decode JWT → inyecta tenant_schema en request.state), require_permission(*permisos), require_perfil(*perfiles), get_db (sesión fijada al tenant del JWT)
- `app/schemas/auth.py`: LoginRequest, LoginResponse, RefreshRequest/Response, ForgotPassword, ResetPassword (refine=contraseñas iguales), ChangePassword, MfaEnrollResponse, MfaVerifyRequest, MeResponse, EmpresaRegisterRequest (validación CIF regex)
- `app/services/auth_service.py`: login (rate limit Redis, verify Argon2id, MFA check, lockout, rehash, audit), logout (revoca token en BD), refresh (rotación), mfa_enroll/mfa_activate, forgot_password (token Redis TTL 1h, 202 siempre), reset_password (verifica Redis + revoca todos los refresh), audit_log en tenant o global
- `app/api/v1/routes/auth.py`: 9 endpoints completos; cookie httpOnly sw_refresh (Secure+SameSite=strict); respuesta siempre 202 en forgot; /empresas/register delega a EmpresaService
- `app/services/empresa_service.py`: valida CIF único + email admin único, INSERT empresa, llama crear_schema_empresa(), INSERT admin rrhh_legal con Argon2id, registra DPA en auditoria_global
- `app/core/config.py`: añadido JWT_PRIVATE_KEY, JWT_PUBLIC_KEY (RS256 prod), JWT_EXPIRES_IN=900s (15min)
- `src/lib/auth/config.ts` + `src/lib/auth/index.ts`: NextAuth v5 con Credentials provider, proxy al API Python, jwt/session callbacks (accessToken+perfil+empresaId+tenantSchema)
- `src/middleware.ts`: protege /worker /hr /equality /direction /inspector por perfil; redirige a /403 o /auth/login
- `src/hooks/useAuth.ts`: useSession wrapper, can(permiso) con mapa de permisos client-side, logout() revoca backend
- `src/app/403/page.tsx`: página de acceso denegado con mensaje neutro
- `tests/test_auth.py`: 10 tests: login OK/fallo/lockout, refresh OK/sin-cookie, logout+revocación, /me auth/unauth, RBAC worker→403/rrhh→no403, cross-tenant isolation

### 2026-05-19 — Sesión 8: Fase 2 completada — Base de datos + multi-tenant
- `database/schemas/001_init.sql` reescrito completo: 6 tablas en public (planes, empresas, usuarios_globales, usuarios, refresh_tokens, auditoria_global), función `crear_schema_empresa()` que genera 15 tablas + 13 índices por tenant, función `eliminar_schema_empresa()` con confirmación 'ELIMINAR_{CIF}' y registro en auditoria_global
- 15 tablas por schema de empresa: denuncias, denuncia_mensajes, denuncia_evidencias, expedientes, expediente_eventos (inmutable+firma+TSA), expediente_plazos, conversaciones_ia (retención 90d), cursos, progreso_formacion, certificados, personas_designadas, mensajes_internos, citas, encuestas_clima, respuestas_clima (sin usuario_id), pares_apoyo, mediaciones, registros_represalia, audit_log (inmutable)
- Alembic configurado: `alembic.ini`, `migrations/env.py` multi-tenant (migra public + todos los schemas activos), `script.py.mako`, migración `0001_init_global_schema.py`
- Flyway: `V001__init_case_management.sql` — valida tablas expedientes/expediente_eventos antes de arrancar Spring Boot
- Seeds: `dev_seed.sql` (2 empresas, 7 usuarios, 3 denuncias, 2 expedientes, 5 cursos, 1 encuesta), `test_seed.sql` (UUIDs fijos, 5 perfiles, 2 denuncias), `prod_seed.sql` (solo planes — upsert idempotente)
- `app/middleware/tenant.py`: TenantMiddleware — valida schema con regex antes de cada request; excluye rutas públicas
- `app/core/database.py`: `get_tenant_session()` con SET LOCAL search_path + rollback automático; `_validate_schema()` previene injection

### 2026-05-19 — Sesión 7: Fase 1 completada — Infraestructura local + CI/CD
- `infrastructure/docker/docker-compose.yml`: healthchecks completos en todos los servicios (postgres, redis, api, ai-engine, case-management, web, landing, nginx) con start_period + retries; volumen nginx_logs añadido
- `Makefile`: targets make setup (verifica Docker+pnpm, copia .env, kill-ports, dev, migrate, seed), make dev, make prod, make down, make logs, make kill-ports (libera puertos 3000/4321/8000/8001/8080/5432/6379/80/443), make reset (confirmación doble), make nuke, make clean, make lint/typecheck/test/build
- `.github/workflows/ci.yml`: jobs lint (ESLint+Ruff+Checkstyle), typecheck (tsc+mypy), test-node (Vitest+coverage), test-python (pytest+PostgreSQL+Redis como services), test-java (JUnit+mvn), build (Turborepo+Maven); concurrency cancel-in-progress
- `.github/workflows/security.yml`: audit-node (pnpm audit), audit-python (pip-audit), audit-java (OWASP Dependency-Check + SARIF), secrets-scan (Gitleaks), trivy (5 imágenes Docker → SARIF); schedule semanal lunes
- `.github/workflows/codeql.yml`: análisis js-ts + python + java-kotlin; schedule martes
- `commitlint.config.js`: tipos extendidos (security, legal); scope-enum con todos los módulos y servicios
- `.husky/pre-commit` (lint-staged) + `.husky/commit-msg` (commitlint)
- `package.json` actualizado: lint-staged config, devDeps husky+commitlint, pnpm como packageManager, script prepare
- `.editorconfig`: indent por lenguaje (2 para ts/js, 4 para py/java/sql), lf, utf-8
- `.github/owasp-suppressions.xml`: plantilla para falsos positivos OWASP

### 2026-05-19 — Sesión 6: Fase 0.5 completada — Documentación de arquitectura
- `docs/architecture/overview.md`: diagrama de bloques Mermaid (4 servicios + frontends + DB + Redis + Nginx); tabla de responsabilidades; tabla de paquetes compartidos; tabla de decisiones de diseño con alternativas descartadas
- `docs/architecture/data-flow-denuncia.md`: diagrama de secuencia completo del flujo E2E de una denuncia cifrada; modelo de claves para denuncia anónima e identificada; tabla de garantías legales cubiertas
- `docs/architecture/data-flow-expediente.md`: diagrama de secuencia de apertura, eventos firmados+TSA, consulta de plazos y exportación; diagrama de comunicación interna API↔Case-Management; tabla de plazos Ley 2/2023; tabla de tipos de evento
- `docs/architecture/multi-tenant.md`: diagrama de schemas por empresa; función crear_schema_empresa(); RLS como segunda capa; ciclo de vida de tenant (Mermaid stateDiagram); flujo de resolución del schema en cada request; tabla de planes; k-anonimato en clima
- `docs/architecture/threat-model.md`: análisis STRIDE completo (S/T/R/I/D/E) con amenazas y mitigaciones; tabla de activos críticos; amenazas fuera de alcance; tabla de controles de cumplimiento normativo (RGPD + Ley 2/2023)

### 2026-05-19 — Sesión 5: Fase 0.4 completada — packages/ui-kit
- Configurado Storybook 8 con addon-a11y, essentials, interactions; preview con globalTypes (theme light/dark/muted)
- 8 primitivos con CVA + WCAG 2.1 AA: Button (7 variants, loading/aria-busy), Input (error/aria-invalid/aria-describedby), Textarea (showCount/aria-live), Badge (8 variants), Card (6 sub-componentes), Skeleton (shape: rectangle/circle/text), Spinner (4 sizes, aria-label), Checkbox (Radix UI, 44px tap target)
- 4 componentes SafeWork de dominio: AnonimoBadge (ShieldCheck + roles ARIA), TrackingCodeDisplay (copy-to-clipboard con feedback, formato XXXX-XXXX-XX), EncryptedFileUpload (AES-256-GCM en cliente vía Web Crypto, SHA-256 pre-cifrado, validación MIME + tamaño), LegalNotice (Ley 2/2023, expandible, dismissible, variante compact)
- Barrel global `src/index.ts` exportando todos los primitivos, componentes SafeWork y `cn`
- `apps/web` conectado: login page y seguimiento page usan Button, Input, Card, Badge, AnonimoBadge, TrackingCodeDisplay, LegalNotice (7 componentes)

### 2026-05-19 — Sesión 4: Fase 0.3 completada
- Expandido `packages/crypto/src/index.ts` en 7 secciones: gestión de claves, cifrado texto, cifrado binario, PBKDF2, AES-KW (wrapKey/unwrapKey), SHA-256 con integridad en tiempo constante, tracking codes
- Añadido `encryptBinary`/`decryptBinary` para archivos de evidencias
- `deriveKeyFromPassword`: PBKDF2-SHA-256 con 600.000 iteraciones (OWASP 2023) y salt de 256 bits
- `wrapKey`/`unwrapKey`: AES-KW (RFC 3394) para envolver claves de contenido
- `sha256` + `verifyIntegrity` (comparación en tiempo constante)
- `generateToken` para tokens de sesión internos
- Constantes exportadas en `CRYPTO_CONSTANTS` para tests y auditorías
- 40+ tests unitarios en `src/__tests__/crypto.test.ts` con vectores conocidos NIST SHA-256
- Configuración Vitest con cobertura ≥ 90% obligatoria
- `packages/crypto/README.md`: modelo de claves completo, tabla de amenazas cubiertas vs no cubiertas, parámetros criptográficos justificados

### 2026-05-19 — Sesión 3: Fase 0.2 completada
- Reorganizado `packages/shared-types` de 1 archivo a 9 archivos por dominio: auth, denuncia, expediente, asistente, formacion, contacto, clima, audit, api
- Añadidos todos los tipos del ROADMAP F0.2.1: permisos granulares, PERMISOS_POR_PERFIL, EvaluacionGravedad, EventoExpediente, PlazoLegal, MensajeChatbot, ContextoConversacion, CertificadoFormacion, PersonaDesignada, MensajeInterno, IndicadorClima, InformePlanIgualdad, RegistroAuditoria, CodigoError, etc.
- Creados 4 schemas Zod en `schemas/`: auth (login, forgot, reset, cambiar password), denuncia (wizard 3 pasos + seguimiento), contacto (cita + mensaje interno), clima (respuesta encuesta con k-anonimato)
- Creado `src/analytics.ts`: tipos EventoGA4, CategoriaGA4, AccionGA4 y catálogo EVENTOS_GA4 completo alineado con google-analytics.ts
- Actualizado `index.ts` como barrel con re-exports de todos los módulos y schemas
- Actualizado `package.json` con `exports` granulares y Zod como dependencia

### 2026-05-19 — Sesión 2: Fase 0.1 completada
- Creado `packages/config/eslint/index.js` con 4 variantes: base, nextjs (con jsx-a11y), astro, node
- Creados 4 archivos TypeScript: `base.json` (strict total), `nextjs.json`, `astro.json`, `node.json`
- Creado `packages/config/tailwind/preset.ts` — paleta completa SafeWork AI (brand/trust/alert/danger/neutral), tipografía, spacing táctil, shadows semánticos, animaciones, breakpoint xs añadido
- Creado `packages/config/prettier/index.js` con overrides por tipo de archivo (JSON, MD, Astro, CSS, SQL)
- Creado `packages/config/package.json` con `exports` completos para que Turborepo resuelva cada config

### 2026-05-19 — Sesión inicial
- Definido el nombre del proyecto: **SafeWork AI**
- Creado y revisado el documento de contexto funcional completo (módulos, perfiles, normativa)
- Definido el stack tecnológico completo
- Creada toda la estructura de carpetas del monorepo
- Creados todos los archivos de configuración base (package.json, turbo.json, .gitignore, .env.example)
- Creados los 3 docker-compose (base, dev, prod) con todos los servicios
- Creados los Dockerfiles de los 4 servicios
- Creada la configuración de apps/web: Next.js 14, Tailwind con paleta propia, Google Analytics integrado, layout.tsx, globals.css con variables CSS, next.config.js con PWA y cabeceras de seguridad
- Creada la configuración de apps/landing: Astro 4, astro.config.mjs
- Creada la estructura de services/api: FastAPI, config.py, router con 8 módulos, requirements.txt
- Creada la estructura de services/ai-engine: FastAPI, requirements.txt con LangChain + Anthropic
- Creada la estructura de services/case-management: Spring Boot 3, Java 21, pom.xml, application.yml
- Creado database/schemas/001_init.sql con esquema multi-tenant completo (función SQL para crear schema por empresa)
- Creado packages/shared-types con todos los tipos TypeScript de la plataforma
- Creado packages/crypto con implementación E2E (AES-256-GCM, Web Crypto API)

---

## Descripción general

SafeWork AI es una plataforma digital **B2B2E** (empresa → empleado/a) desarrollada por **REKER Tech Solutions S.L.** (Las Palmas de Gran Canaria, España, régimen ZEC) para dar respuesta efectiva a una necesidad legal y humana urgente: ofrecer a los trabajadores y trabajadoras un canal seguro, accesible y confidencial para reportar, gestionar y recibir apoyo ante situaciones de acoso laboral y acoso por razón de sexo (machista) en el entorno de trabajo.

> España tiene obligación legal de disponer de protocolos de acoso desde la Ley Orgánica 3/2007, reforzada por la reforma del RDL 6/2019 y la Ley 2/2023 (canal de denuncias anónimo para empresas de +50 empleados). SafeWork AI convierte ese cumplimiento normativo en una herramienta real y accesible.

### Objetivos del proyecto

1. Ser una herramienta de uso real para los empleados y empleadas que sufren o presencian situaciones de acoso, proporcionándoles apoyo inmediato, formación preventiva y vías de denuncia seguras.
2. Ser una solución de cumplimiento normativo para las empresas, que les permita acreditar ante la Inspección de Trabajo y el Ministerio de Igualdad que disponen de mecanismos operativos y no solo documentales.

### Propuesta de expansión institucional

El objetivo de REKER es presentar SafeWork AI al Ministerio de Igualdad y al Ministerio de Trabajo como herramienta de referencia. Más de 200.000 empresas españolas están sujetas a la obligación. Modelo escalable a toda la UE (Directiva 2019/1937 + RGPD desde el primer día).

---

## Contexto normativo

- **LO 3/2007** — igualdad, protocolos de acoso
- **RDL 6/2019** — Plan de Igualdad obligatorio
- **Ley 2/2023** — canal de denuncias anónimo obligatorio para empresas +50 empleados (transposición Directiva Whistleblowing)
- **LPRL arts. 14 y 16** — evaluación de riesgos psicosociales (incluye acoso)
- **Directiva UE 2019/1937** — protección del denunciante a nivel europeo
- **LOPD / RGPD** — base legal de tratamiento, retención, derecho al olvido, DPD

---

## Módulos de la plataforma (8 módulos funcionales interconectados)

### M1 — Canal seguro de denuncia
Canal de denuncia anónimo y cifrado E2E, conforme a la Ley 2/2023.
- Formulario sin almacenamiento de IP ni metadatos identificativos
- Adjuntar evidencias (capturas, audios, documentos) con cifrado en origen antes de la subida
- Código de seguimiento único para consultar estado sin identificarse
- Modo discreto en app móvil (aparece como "Notas" o "Calculadora")
- Opción de denuncia identificada si el usuario lo decide voluntariamente

### M2 — Asistente IA de apoyo
Chatbot empático 24/7. No diagnostica, orienta.
- Escucha activa estructurada con criterios clínicos y legales de identificación del acoso
- Evaluación de: gravedad, reiteración, relación de poder, impacto emocional y laboral
- Derivación inteligente: recursos informativos / contacto con persona designada / apertura de expediente

### M3 — Formación y recursos
- Microlearning 5-15 min por perfil (trabajador/a, mando intermedio, RR.HH., representante sindical)
- Certificados descargables válidos ante Inspección de Trabajo
- Biblioteca normativa con actualizaciones automáticas

### M4 — Línea de contacto con personas designadas
- Directorio cifrado de la persona/comisión de igualdad
- Mensajería interna cifrada (fuera del email corporativo)
- Agenda de citas (presencial, telefónica, videollamada)
- Derivación opcional a asesoría externa (jurídica, psicológica)

### M5 — Gestión de casos (back-office RR.HH./Legal)
- Panel de expedientes con trazabilidad completa
- Alertas automáticas de plazos legales
- Comunicación bidireccional anónima con denunciante (vía código de seguimiento)
- Firma digital y sellado de tiempo con valor probatorio
- Control de acceso por roles

### M6 — Cumplimiento normativo y reporting
- Dashboard ejecutivo: incidencias, tiempos de resolución, formación, índice clima
- Generación automática del informe anual del Plan de Igualdad
- Exportación para la Inspección de Trabajo

### M7 — Termómetro de clima laboral
- Pulso mensual anónimo (3-5 preguntas) por departamento/equipo
- IA detecta tendencias antes de que se produzcan denuncias formales
- Alertas tempranas a dirección
- Metodología FPSICO / INSST

### M8 — Red de apoyo entre pares y mediación
- Registro voluntario como "persona de apoyo"
- Mediación online guiada con registro del proceso y acuerdo
- Protección del denunciante: registro de represalias con alerta automática

---

## Perfiles de usuario (5, acceso estrictamente segmentado)

| Perfil | Acceso |
|---|---|
| **Trabajador/a** | Chatbot IA, canal de denuncia, formación, línea de contacto, historial personal cifrado, termómetro de clima. Todo anónimo si lo decide. |
| **Responsable de Igualdad / Persona designada** | Mensajería cifrada, gestión de citas, notificaciones de nuevos casos. |
| **RR.HH. / Legal** | Panel de expedientes, plazos legales, comunicación con denunciantes. |
| **Dirección** | Dashboard KPIs, informes de cumplimiento, resultados agregados de clima. Sin acceso a expedientes individuales. |
| **Inspección de Trabajo** | Solo lectura de informes de cumplimiento, vía API pública o exportación certificada. |

---

## Principios técnicos irrenunciables

- **Cifrado E2E (AES-256-GCM):** ni el operador puede leer denuncias o conversaciones sin la clave del usuario
- **Anonimización por diseño:** no se almacena IP ni metadatos identificativos
- **Multi-tenant por schema:** datos de cada empresa completamente aislados en PostgreSQL
- **LOPD/RGPD compliant:** retención, derecho al olvido, DPD
- **Audit log inmutable:** registro de cada acceso (quién, qué, cuándo, desde dónde)
- **Cloud europeo + ISO 27001**
- **PWA + app nativa iOS/Android**

---

## Stack tecnológico

### Arquitectura
Monorepo gestionado con **Turborepo**. Separación estricta entre apps (frontend), services (backend) y packages (código compartido).

### Frontend

| Herramienta | Uso |
|---|---|
| **Next.js 14** (App Router) | App web principal — PWA + SSR |
| **Astro 4** | Landing page estática |
| **React 18** | UI en ambas apps |
| **Tailwind CSS** | Estilos (utility-first) |
| **shadcn/ui** | Componentes base accesibles (Radix UI) |
| **Aceternity UI** | Componentes visuales premium |
| **Magic UI** | Componentes animados |
| **Framer Motion** | Animaciones declarativas en React |
| **GSAP** | Animaciones avanzadas y ScrollTrigger |
| **Zustand** | Estado global |
| **React Query** | Fetching y caché de datos del servidor |
| **React Hook Form + Zod** | Formularios con validación |
| **Recharts** | Gráficos del dashboard |

### Backend

| Herramienta | Uso |
|---|---|
| **Python 3.12 + FastAPI** | API REST principal |
| **Python 3.12 + FastAPI** | Motor IA (chatbot M2, análisis M7) |
| **LangChain + Anthropic/OpenAI** | Lógica del chatbot del asistente |
| **Java 21 + Spring Boot 3** | Gestión de expedientes M5 (firma digital, sellado de tiempo) |
| **SQLAlchemy + Alembic** | ORM y migraciones Python |
| **Pydantic v2** | Validación de datos en Python |

### Base de datos e infraestructura

| Herramienta | Uso |
|---|---|
| **PostgreSQL 16** | Base de datos principal (multi-tenant por schema) |
| **Redis 7** | Sesiones, caché, rate limiting |
| **Docker + Docker Compose** | Contenedorización dev y prod |
| **Nginx** | Reverse proxy + SSL termination |
| **Prometheus + Grafana** | Monitoreo en producción |
| **Adminer** | UI de base de datos (solo desarrollo) |
| **Mailhog** | SMTP local (solo desarrollo) |

### Analytics y observabilidad

| Herramienta | Uso |
|---|---|
| **Google Analytics 4** | Métricas de uso (eventos anonimizados — sin datos personales) |
| **Sentry** | Tracking de errores |

### Paquetes internos (`packages/`)

| Paquete | Contenido |
|---|---|
| `@safework/shared-types` | Tipos TypeScript de toda la plataforma (entidades, enums, respuestas API) |
| `@safework/crypto` | Cifrado E2E cliente: AES-256-GCM con Web Crypto API nativa |
| `@safework/ui-kit` | Componentes React compartidos entre apps |
| `@safework/config` | Configs compartidas: ESLint, TypeScript, Tailwind |

---

## Estructura de carpetas

```
safework-ai/
├── apps/
│   ├── web/                            # Next.js 14 — App principal (PWA)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/             # Login, registro
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (worker)/           # Perfil trabajador/a
│   │   │   │   │   ├── denuncia/       # M1 — Canal de denuncia
│   │   │   │   │   ├── asistente/      # M2 — Chatbot IA
│   │   │   │   │   ├── formacion/      # M3 — Biblioteca formativa
│   │   │   │   │   ├── contacto/       # M4 — Línea de contacto
│   │   │   │   │   ├── seguimiento/    # M1 — Consulta por código
│   │   │   │   │   └── clima/          # M7 — Encuesta de clima
│   │   │   │   ├── (equality)/         # Responsable de Igualdad
│   │   │   │   │   ├── casos/
│   │   │   │   │   ├── mensajeria/
│   │   │   │   │   └── citas/
│   │   │   │   ├── (hr)/               # RR.HH. / Legal
│   │   │   │   │   ├── expedientes/
│   │   │   │   │   ├── plazos/
│   │   │   │   │   └── comunicaciones/
│   │   │   │   ├── (direction)/        # Dirección
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   └── reportes/
│   │   │   │   ├── (inspector)/        # Inspección de Trabajo
│   │   │   │   │   └── informes/
│   │   │   │   └── api/v1/             # API Routes de Next.js
│   │   │   ├── components/
│   │   │   │   ├── ui/                 # shadcn/ui base
│   │   │   │   ├── aceternity/         # Aceternity UI
│   │   │   │   ├── magic/              # Magic UI
│   │   │   │   ├── animations/         # Framer Motion + GSAP
│   │   │   │   ├── modules/
│   │   │   │   │   ├── m1-denuncia/
│   │   │   │   │   ├── m2-asistente/
│   │   │   │   │   ├── m3-formacion/
│   │   │   │   │   ├── m4-contacto/
│   │   │   │   │   ├── m5-expedientes/
│   │   │   │   │   ├── m6-reporting/
│   │   │   │   │   ├── m7-clima/
│   │   │   │   │   └── m8-mediacion/
│   │   │   │   ├── layout/             # Layouts globales
│   │   │   │   └── common/             # Reutilizables generales
│   │   │   ├── lib/
│   │   │   │   ├── analytics/          # Google Analytics (google-analytics.ts)
│   │   │   │   ├── crypto/             # Cifrado E2E cliente
│   │   │   │   ├── api/                # Cliente HTTP (axios)
│   │   │   │   └── validations/        # Schemas Zod
│   │   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── store/                  # Estado global Zustand
│   │   │   ├── types/                  # Tipos locales
│   │   │   └── styles/
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   └── images/
│   │   ├── next.config.js              # PWA + CSP headers + imágenes
│   │   ├── tailwind.config.ts          # Paleta SafeWork AI + shadcn vars
│   │   ├── package.json
│   │   └── Dockerfile                  # Multi-stage: dev / builder / prod
│   │
│   └── landing/                        # Astro 4 — Landing page estática
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   │   ├── sections/           # Hero, Features, Pricing, CTA, etc.
│       │   │   ├── ui/
│       │   │   └── animations/
│       │   ├── layouts/
│       │   ├── lib/
│       │   │   └── analytics/
│       │   └── styles/
│       ├── public/
│       ├── astro.config.mjs
│       ├── package.json
│       └── Dockerfile
│
├── services/
│   ├── api/                            # Python FastAPI — API principal
│   │   ├── app/
│   │   │   ├── main.py                 # Entry point FastAPI
│   │   │   ├── api/
│   │   │   │   └── v1/
│   │   │   │       ├── routes/__init__.py  # Router con 8 módulos
│   │   │   │       └── endpoints/
│   │   │   │           ├── auth/
│   │   │   │           ├── denuncias/
│   │   │   │           ├── casos/
│   │   │   │           ├── formacion/
│   │   │   │           ├── usuarios/
│   │   │   │           ├── empresas/
│   │   │   │           ├── clima/
│   │   │   │           └── reportes/
│   │   │   ├── core/
│   │   │   │   └── config.py           # Settings con pydantic-settings
│   │   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── services/               # Lógica de negocio
│   │   │   ├── repositories/           # Acceso a datos
│   │   │   ├── middleware/             # Auth, rate limit, multi-tenant
│   │   │   └── utils/
│   │   │       ├── crypto/
│   │   │       └── email/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── ai-engine/                      # Python FastAPI — Motor IA
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── chatbot/                # M2 — Asistente empático
│   │   │   ├── analytics/              # M7 — Análisis de clima
│   │   │   ├── models/                 # Modelos ML
│   │   │   ├── prompts/                # System prompts del chatbot
│   │   │   ├── evaluators/             # Evaluadores de gravedad/riesgo
│   │   │   └── utils/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── case-management/                # Java 21 Spring Boot 3 — M5 Expedientes
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/es/reker/safework/
│       │   │   │   ├── controller/
│       │   │   │   ├── service/
│       │   │   │   ├── repository/
│       │   │   │   ├── model/
│       │   │   │   ├── dto/
│       │   │   │   ├── config/
│       │   │   │   ├── security/
│       │   │   │   └── events/
│       │   │   └── resources/
│       │   │       └── application.yml
│       │   └── test/
│       ├── pom.xml
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/                   # Tipos TS compartidos
│   │   └── src/index.ts                # Entidades, enums, ApiResponse, etc.
│   ├── crypto/                         # E2E encryption cliente
│   │   └── src/index.ts                # AES-256-GCM, generateTrackingCode
│   ├── ui-kit/                         # Componentes UI compartidos
│   │   └── src/
│   │       ├── components/
│   │       └── styles/
│   └── config/                         # Configs compartidas
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── database/
│   ├── schemas/
│   │   └── 001_init.sql               # Schema multi-tenant + función crear_schema_empresa
│   ├── migrations/                     # Alembic (Python) / Flyway (Java)
│   ├── seeds/
│   │   ├── dev/
│   │   └── test/
│   └── init/
│       └── 00_init.sql                # Script Docker entrypoint
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml         # Base: PostgreSQL, Redis, todos los servicios, Nginx
│   │   ├── docker-compose.dev.yml     # Dev: hot reload, Adminer (:8888), Mailhog (:8025)
│   │   └── docker-compose.prod.yml    # Prod: réplicas, Prometheus, Grafana
│   ├── nginx/
│   │   ├── conf.d/
│   │   └── ssl/
│   ├── monitoring/
│   │   ├── prometheus/
│   │   └── grafana/
│   └── scripts/
│
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── legal/
│   └── onboarding/
│
├── .github/
│   └── workflows/                      # CI/CD (pendiente)
│
├── package.json                        # Monorepo root — Turborepo workspaces
├── turbo.json                          # Pipeline: dev, build, lint, test
├── .env.example                        # Todas las variables documentadas
├── .gitignore
└── CONTEXTO.md                         # Este archivo — fuente de verdad del proyecto
```

---

## Decisiones técnicas tomadas

| Decisión | Opción elegida | Razón |
|---|---|---|
| Arquitectura frontend | Monorepo (Turborepo) | Compartir tipos, crypto y UI entre web y landing |
| App principal | Next.js 14 (App Router) | SSR + PWA + rutas por grupos de perfil |
| Landing | Astro 4 | Generación estática pura, máximo rendimiento |
| API principal | Python FastAPI | Velocidad de desarrollo, tipado con Pydantic, ideal para IA |
| Gestión de expedientes | Java Spring Boot | Robustez enterprise, firma digital, sellado de tiempo |
| Base de datos | PostgreSQL multi-tenant por schema | Aislamiento total por empresa sin complejidad de múltiples DBs |
| Cifrado E2E | AES-256-GCM (Web Crypto API) | Nativa en browser y Node, sin dependencias externas |
| Estado global | Zustand | Ligero, sin boilerplate, compatible con SSR |
| Formularios | React Hook Form + Zod | Rendimiento + validación tipada |
| Estilos | Tailwind CSS + shadcn/ui | Velocidad + accesibilidad + personalizable |
| Analytics | Google Analytics 4 con IP anonimizada | Cumplimiento RGPD, sin datos personales en eventos |

---

## Archivos clave ya creados

| Archivo | Descripción |
|---|---|
| [apps/web/next.config.js](apps/web/next.config.js) | Next.js: PWA, CSP headers de seguridad, optimización de imágenes |
| [apps/web/tailwind.config.ts](apps/web/tailwind.config.ts) | Paleta de colores SafeWork AI (brand, trust, alert, danger) + variables shadcn |
| [apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx) | Root layout con Google Analytics GA4 integrado |
| [apps/web/src/app/globals.css](apps/web/src/app/globals.css) | Variables CSS de shadcn/ui (light + dark mode) |
| [apps/web/src/lib/analytics/google-analytics.ts](apps/web/src/lib/analytics/google-analytics.ts) | Eventos GA4 tipados por módulo (denuncia, asistente, formación, clima) |
| [apps/landing/astro.config.mjs](apps/landing/astro.config.mjs) | Astro: React, Tailwind, sitemap, output estático |
| [services/api/app/main.py](services/api/app/main.py) | FastAPI entry point con CORS, TrustedHost, health check |
| [services/api/app/core/config.py](services/api/app/core/config.py) | Settings centralizados (pydantic-settings) |
| [services/api/app/api/v1/routes/__init__.py](services/api/app/api/v1/routes/__init__.py) | Router con los 8 módulos mapeados |
| [services/ai-engine/app/main.py](services/ai-engine/app/main.py) | FastAPI del motor IA con rutas chatbot y analytics |
| [services/case-management/pom.xml](services/case-management/pom.xml) | Maven: Spring Boot 3, JWT, PostgreSQL, Redis, Lombok |
| [services/case-management/src/main/resources/application.yml](services/case-management/src/main/resources/application.yml) | Config Spring Boot con perfiles dev/prod |
| [database/schemas/001_init.sql](database/schemas/001_init.sql) | Schema SQL: tablas globales + función `crear_schema_empresa` para multi-tenant |
| [packages/shared-types/src/index.ts](packages/shared-types/src/index.ts) | Todos los tipos TypeScript de la plataforma |
| [packages/crypto/src/index.ts](packages/crypto/src/index.ts) | Cifrado E2E: encrypt, decrypt, generateKey, generateTrackingCode |
| [infrastructure/docker/docker-compose.yml](infrastructure/docker/docker-compose.yml) | Base: PostgreSQL, Redis, todos los servicios, Nginx |
| [infrastructure/docker/docker-compose.dev.yml](infrastructure/docker/docker-compose.dev.yml) | Dev: hot reload + Adminer + Mailhog |
| [infrastructure/docker/docker-compose.prod.yml](infrastructure/docker/docker-compose.prod.yml) | Prod: réplicas + Prometheus + Grafana |
| [.env.example](.env.example) | Todas las variables de entorno documentadas |

---

## Comandos principales

```bash
# Arrancar todo en desarrollo (Turborepo)
npm run dev

# Solo la web (Next.js)
npm run web

# Solo la landing (Astro)
npm run landing

# Docker — desarrollo completo (con Adminer en :8888 y Mailhog en :8025)
docker-compose -f infrastructure/docker/docker-compose.yml \
               -f infrastructure/docker/docker-compose.dev.yml up

# Docker — producción
docker-compose -f infrastructure/docker/docker-compose.yml \
               -f infrastructure/docker/docker-compose.prod.yml up -d

# Python API en local (sin Docker)
cd services/api && uvicorn app.main:app --reload

# AI Engine en local
cd services/ai-engine && uvicorn app.main:app --port 8001 --reload

# Java Case Management en local
cd services/case-management && mvn spring-boot:run -Pdev
```

---

## Sobre REKER Tech Solutions

REKER Tech Solutions S.L. — Las Palmas de Gran Canaria, España. Régimen ZEC (Zona Especial Canaria). El proyecto está siendo desarrollado por Pablo (pablo@reker.es), fundador de REKER.

---

*SafeWork AI — Plataforma integral de prevención y gestión del acoso laboral y machista*
*Desarrollado por REKER Tech Solutions S.L. — Actualizado: 2026-05-19*
