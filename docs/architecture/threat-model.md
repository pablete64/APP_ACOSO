# Modelo de amenazas — SafeWork AI (STRIDE)

## Activos a proteger

| Activo | Criticidad | Descripción |
|---|---|---|
| Contenido de denuncias | CRÍTICA | Relatos cifrados E2E; revelación = incumplimiento Ley 2/2023 |
| Identidad del denunciante anónimo | CRÍTICA | Revelarla es delito (art. 36 Ley 2/2023) |
| Claves criptográficas | ALTA | sessionKey, contentKey, wrappedKey |
| Expedientes firmados | ALTA | Valor probatorio; alterarlos = falsedad documental |
| Datos del clima laboral | MEDIA | Protección estadística k-anonimato |
| Tokens de sesión | MEDIA | Permiten acceso a toda la cuenta |
| Logs de auditoría | MEDIA | Inmutables; manipulación destruye trazabilidad |
| Metadatos de empresa | BAJA | Nombre, plan, contacto |

## Análisis STRIDE

### S — Spoofing (Suplantación de identidad)

| Amenaza | Mitigación |
|---|---|
| Atacante suplanta usuario con contraseña robada | MFA (fase futura) · PBKDF2 600k iter · bcrypt en BD |
| JWT forjado | Firma HMAC-SHA256 con secreto 256-bit; verificación en cada request |
| Suplantación de tenant (JWT con tenantSchema falso) | JWT firmado y verificado; tenantSchema derivado del userId en BD, no del JWT |
| Phishing de credenciales | CSP estricto en headers; `SameSite=Strict` en cookies |

### T — Tampering (Manipulación de datos)

| Amenaza | Mitigación |
|---|---|
| Modificar ciphertext de una denuncia | AES-256-GCM incluye tag de autenticación; modificación detectable |
| Alterar evidencias | SHA-256 del original almacenado y verificable por el usuario |
| Modificar eventos de expediente | Firma digital + sello TSA (RFC 3161) en cada evento |
| SQL injection | SQLAlchemy ORM con parámetros ligados; nunca SQL dinámico con strings |
| XSS en formularios | React escapa por defecto; CSP `script-src 'self'` sin `unsafe-inline` |

### R — Repudiation (Repudio)

| Amenaza | Mitigación |
|---|---|
| Usuario niega haber creado una denuncia | audit_log inmutable con IP hasheada + timestamp + firma de evento |
| Instructor niega haber tomado una actuación | Evento de expediente con firma digital verificable + TSA |
| Admin niega haber accedido a datos | audit_log con AccionAudit tipada por cada operación sensible |

### I — Information Disclosure (Fuga de información)

| Amenaza | Mitigación |
|---|---|
| Servidor lee plaintext de denuncias | E2E encryption: servidor solo almacena ciphertext |
| Cross-tenant data leakage | `SET search_path` + RLS + tenantSchema en JWT verificado |
| Logs revelan datos personales | IP hasheada (SHA-256) en audit_log; no se loguea contenido de denuncias |
| Backups de BD exponen datos | Backups cifrados con clave de empresa (AES-256) almacenada en KMS |
| Evidencias expuestas en storage | Almacenadas ya cifradas; solo ciphertext en disco |
| Analytics revelan identidad | GA4 con `anonymize_ip: true`; eventos sin userId ni datos personales |

### D — Denial of Service (Denegación de servicio)

| Amenaza | Mitigación |
|---|---|
| Flood de peticiones de login | Rate limiting en Redis (10 req/min por IP en /auth/*) |
| Upload masivo de evidencias | Límite 50MB por archivo, 10 archivos por denuncia, cuota por tenant |
| PBKDF2 como vector de DoS (600k iter en servidor) | PBKDF2 se ejecuta SOLO en cliente (Web Crypto); servidor recibe hash |
| Conexiones BD exhaustas | Connection pooling (PgBouncer); max_connections por tenant |
| Ataques al AI engine (prompt flooding) | Rate limit por sesión en /ai/*; timeout 30s por request |

### E — Elevation of Privilege (Escalada de privilegios)

| Amenaza | Mitigación |
|---|---|
| Trabajador accede a módulo HR | PERMISOS_POR_PERFIL verificado en middleware; cada route group protegido |
| HR ve denuncias anónimas identificadas | Imposible sin la clave; el campo `denunciante_id` es null en anónimas |
| Inspector accede a datos de otra empresa | tenantSchema en JWT; `SET search_path` hace imposible el cross-tenant |
| Escalada por IDOR (ID predecible) | UUIDs v4 en todos los IDs; no hay IDs secuenciales expuestos |
| Injection en prompts del asistente IA | Prompt injection sanitizado; sin acceso a herramientas destructivas |

## Amenazas fuera de alcance (versión actual)

| Amenaza | Motivo de exclusión |
|---|---|
| Compromiso de la máquina del usuario final | Fuera del modelo de amenaza de la aplicación |
| Vulnerabilidad 0-day en PostgreSQL | Mitigado con actualizaciones; no modelado |
| Coerción física del operador | Mitigado con cifrado E2E; servidor no puede entregar plaintext |
| Ataques de canal lateral en PBKDF2 | Ejecutado en cliente (Web Crypto del browser); no en servidor |

## Controles de cumplimiento normativo

| Control | Normativa | Implementación |
|---|---|---|
| Cifrado en tránsito | RGPD art. 32 | TLS 1.3 en Nginx |
| Cifrado en reposo | RGPD art. 32 | AES-256-GCM E2E; backups cifrados |
| Pseudonimización | RGPD art. 4.5 | IP hasheada en logs; sin userId en clima |
| Derecho al olvido | RGPD art. 17 | `eliminar_schema_empresa()` borra todo el schema |
| Conservación 10 años | Ley 2/2023 art. 24 | Backup cifrado en cold storage; schema no borrado antes |
| Acceso mínimo necesario | RGPD art. 5.1.b | PERMISOS_POR_PERFIL con 30+ permisos granulares |
| Trazabilidad completa | Ley 2/2023 art. 9 | audit_log inmutable con 30+ AccionAudit tipadas |
