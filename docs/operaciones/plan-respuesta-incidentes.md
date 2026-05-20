# SafeWork AI — Plan de Respuesta a Incidentes de Seguridad

**Responsable**: DPO / REKER Tech Solutions S.L.  
**Clasificación**: Interno — Confidencial  
**Revisado conforme a**: RGPD art. 33-34, ENS, ISO/IEC 27035  
**Revisión**: Mayo 2025

---

## 1. Alcance

Este plan aplica a todos los incidentes de seguridad que afecten a SafeWork AI, incluyendo:

- Acceso no autorizado a datos personales (brechas de seguridad)
- Pérdida o destrucción de datos
- Ransomware o malware
- Denegación de servicio
- Vulnerabilidades explotadas en producción
- Exposición accidental de secretos o credenciales

---

## 2. Clasificación de incidentes

| Nivel | Descripción | Tiempo de respuesta inicial |
|---|---|---|
| **P1 — Crítico** | Brecha de datos personales confirmada; servicio completamente inaccesible | < 30 minutos |
| **P2 — Alto** | Sospecha de brecha; degradación severa del servicio; credenciales comprometidas | < 2 horas |
| **P3 — Medio** | Vulnerabilidad explotada sin acceso a datos; degradación moderada | < 8 horas |
| **P4 — Bajo** | Intento de ataque bloqueado; anomalía sin impacto confirmado | < 24 horas |

---

## 3. Equipo de respuesta

| Rol | Responsable | Contacto |
|---|---|---|
| Coordinador de incidentes | Pablo (CEO/CTO) | pablo@reker.es |
| DPO | Por designar | dpo@safework.es |
| Operaciones | Equipo Ops | ops@reker.es |
| Asesor legal | Por designar | legal@reker.es |

---

## 4. Proceso de respuesta

### Fase 1 — Detección y notificación (0-30 min)

1. El incidente se detecta vía:
   - Alerta de Prometheus/Alertmanager
   - Reporte de un usuario o cliente
   - Audit log de AWS CloudTrail
   - Reporte externo (investigador, CERT)

2. El detector notifica al **Coordinador de incidentes** por email cifrado y teléfono.

3. Se abre un canal privado de gestión del incidente (#inc-YYYYMMDD-NNN).

4. Se asigna un **Incident Commander** (IC) que coordina todas las acciones.

### Fase 2 — Contención (30 min - 4 h)

Acciones inmediatas según el tipo de incidente:

**Brecha de datos / acceso no autorizado:**
```bash
# 1. Revocar credenciales comprometidas
# En AWS Secrets Manager — rotar el secreto afectado

# 2. Bloquear IP/rango atacante en Nginx
# Añadir a /etc/nginx/conf.d/blocklist.conf:
deny <IP_ATACANTE>/32;
docker compose exec nginx nginx -s reload

# 3. Forzar logout de todas las sesiones activas
docker compose exec redis redis-cli FLUSHDB

# 4. Escalar a solo lectura si es necesario
# Poner la API en modo mantenimiento
```

**Credenciales expuestas:**
```bash
# Rotar inmediatamente en este orden:
# 1. JWT_SECRET (invalida todas las sesiones)
# 2. DATABASE_PASSWORD
# 3. ENCRYPTION_KEY (requiere script de re-cifrado — ver runbook)
# 4. Claves de AWS (via IAM console)
```

**Ransomware / destrucción de datos:**
```bash
# 1. Aislar el nodo afectado
docker compose stop <servicio_afectado>

# 2. Iniciar recuperación desde backup RDS (PITR)
# En AWS Console → RDS → Restore to point in time
# Seleccionar timestamp anterior al incidente

# 3. Verificar integridad de backups S3 (versionado activo)
aws s3api list-object-versions \
  --bucket safework-production-evidencias-<account_id> \
  --prefix "" --query 'Versions[?IsLatest!=`true`]' | head -20
```

### Fase 3 — Erradicación (4 - 24 h)

1. Identificar la causa raíz (root cause analysis preliminar).
2. Eliminar el vector de ataque:
   - Parchear vulnerabilidad
   - Revocar accesos innecesarios
   - Actualizar reglas de firewall/WAF
3. Verificar que no quedan puertas traseras.
4. Validar la integridad de los datos en producción.

### Fase 4 — Recuperación (24 - 72 h)

1. Restaurar servicios en orden: PostgreSQL → Redis → API → AI Engine → Web.
2. Monitorizar intensivamente durante 48h (aumentar frecuencia de scrape a 5s).
3. Comunicar a los clientes afectados si aplica (ver Sección 5).
4. Documentar todas las acciones tomadas con timestamps.

### Fase 5 — Lecciones aprendidas (72 h - 2 semanas)

1. Post-mortem sin culpa (blameless post-mortem) en las 72h siguientes a la resolución.
2. Actualizar este plan y el runbook con los hallazgos.
3. Revisar y mejorar controles preventivos.

---

## 5. Notificaciones legales

### 5.1 Notificación a la AEPD (art. 33 RGPD)

**Plazo**: 72 horas desde el conocimiento de la brecha (si hay riesgo para derechos y libertades).

**Información requerida**:
- Naturaleza de la brecha (categorías y número aproximado de afectados)
- Nombre y datos del DPO
- Consecuencias probables
- Medidas adoptadas o propuestas

**Formulario**: [sede.aepd.gob.es](https://sede.aepd.gob.es) → Notificación de brechas

```
Checklist notificación AEPD:
[ ] Fecha y hora de detección de la brecha
[ ] Fecha y hora del inicio estimado de la brecha
[ ] Tipos de datos personales afectados
[ ] Número estimado de registros afectados
[ ] Número estimado de afectados (personas)
[ ] Descripción de las medidas técnicas adoptadas
[ ] Contacto del DPO: dpo@safework.es
```

### 5.2 Comunicación a los interesados (art. 34 RGPD)

**Aplica si**: alto riesgo para derechos y libertades de personas físicas.

**Plazo**: Sin demora indebida.

**Canal**: Email directo al usuario afectado + aviso en la plataforma.

**Contenido mínimo**:
- Descripción clara del incidente
- Datos afectados
- Consecuencias probables
- Medidas adoptadas
- Datos de contacto del DPO

**Plantilla de comunicación** (adaptar según el caso):

> Estimado/a [nombre]:
>
> Le informamos de que SafeWork AI ha detectado un incidente de seguridad que podría haber afectado a sus datos personales.
>
> **Qué ha ocurrido**: [descripción]  
> **Datos potencialmente afectados**: [tipos de datos]  
> **Medidas adoptadas**: [acciones]  
> **Qué puede hacer**: [recomendaciones]
>
> Para cualquier consulta, contacte con nuestro DPO: dpo@safework.es
>
> REKER Tech Solutions S.L.

### 5.3 Comunicación a clientes empresa (responsables del tratamiento)

Notificar al responsable de protección de datos de la empresa cliente en un plazo de **24 horas** desde la confirmación de la brecha, independientemente de la notificación a la AEPD.

---

## 6. Registro de incidentes

Todos los incidentes deben registrarse en el **Registro de Actividades de Tratamiento (RAT)** con los siguientes campos:

| Campo | Descripción |
|---|---|
| ID | INC-YYYYMMDD-NNN |
| Fecha detección | Timestamp UTC |
| Fecha cierre | Timestamp UTC |
| Clasificación | P1/P2/P3/P4 |
| Tipo | Brecha datos / DDoS / Malware / Otro |
| Datos afectados | Categorías y volumen |
| Afectados | Número de personas |
| Notificación AEPD | Sí/No/No aplica — fecha |
| Notificación afectados | Sí/No/No aplica — fecha |
| Causa raíz | Descripción |
| Acciones correctoras | Lista |
| IC responsable | Nombre |

---

## 7. Pruebas del plan

Este plan debe probarse mediante:

- **Simulacro tabletop** (ejercicio teórico): cada 6 meses
- **Drill técnico** (simulación real de incidente en entorno de staging): anualmente
- **Revisión y actualización del plan**: tras cada incidente real y anualmente

Próxima revisión programada: **noviembre 2025**
