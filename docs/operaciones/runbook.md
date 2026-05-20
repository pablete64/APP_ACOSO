# SafeWork AI — Runbook Operativo

**Responsable**: Equipo de Operaciones REKER Tech Solutions S.L.  
**Clasificación**: Interno — Confidencial  
**Revisión**: Mayo 2025

---

## 1. Arranque del sistema

### 1.1 Arranque completo (producción)

```bash
# Desde el directorio raíz del proyecto
cd infrastructure/docker

# Levantar con override de producción
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verificar que todos los servicios están healthy
docker compose ps
docker compose logs --tail=50 api
```

### 1.2 Verificación de salud

```bash
# Endpoint de health (HTTP 200 = OK)
curl -sf https://safework.es/health | jq .

# Endpoint de readiness
curl -sf https://safework.es/readiness | jq .

# Estado de Prometheus
curl -sf http://localhost:9090/-/healthy

# Estado de Grafana
curl -sf http://localhost:3000/api/health | jq .
```

### 1.3 Variables de entorno requeridas

| Variable | Descripción | Fuente |
|---|---|---|
| `DATABASE_PASSWORD` | Contraseña PostgreSQL | AWS Secrets Manager |
| `JWT_SECRET` | Clave firma JWT (mínimo 64 chars) | AWS Secrets Manager |
| `ENCRYPTION_KEY` | Clave AES-256 cifrado E2E | AWS Secrets Manager |
| `GRAFANA_ADMIN_PASSWORD` | Contraseña admin Grafana | AWS Secrets Manager |
| `SMTP_PASSWORD` | Contraseña SMTP alertas | AWS Secrets Manager |

---

## 2. Procedimientos de parada

### 2.1 Parada ordenada (rolling)

```bash
# Reducir réplicas a 0 antes de parar para evitar peticiones en vuelo
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --scale api=0 --scale ai-engine=0

# Esperar 30s y parar todo
sleep 30
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### 2.2 Parada de emergencia

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --timeout 5
```

---

## 3. Despliegue de nueva versión

```bash
# 1. Construir nuevas imágenes
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api ai-engine

# 2. Aplicar migraciones de base de datos
docker compose run --rm api alembic upgrade head

# 3. Rolling restart sin downtime
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  --no-deps api

# 4. Verificar logs durante 2 min
docker compose logs -f api --tail=100
```

### Rollback

```bash
# Volver a la imagen anterior (tag anterior)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --no-deps api
# (Asegurarse de que docker-compose.yml apunta a la imagen anterior)
```

---

## 4. Gestión de la base de datos

### 4.1 Backup manual

```bash
# Backup completo
docker compose exec postgres pg_dump \
  -U safework -d safework_db \
  -F c -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump

# Copiar al host
docker compose cp postgres:/tmp/backup_*.dump ./backups/
```

### 4.2 Restaurar backup

```bash
# CUIDADO: esto sobreescribe datos actuales
docker compose exec -T postgres pg_restore \
  -U safework -d safework_db \
  --clean --if-exists < ./backups/backup_YYYYMMDD.dump
```

### 4.3 Migración de emergencia

```bash
# Revertir última migración
docker compose run --rm api alembic downgrade -1

# Ver historial
docker compose run --rm api alembic history --verbose
```

---

## 5. Redis — mantenimiento

```bash
# Ver info de Redis
docker compose exec redis redis-cli INFO replication

# Flush cache (CUIDADO: expira todas las sesiones)
docker compose exec redis redis-cli FLUSHDB

# Ver keys activas (rate-limiters, sesiones)
docker compose exec redis redis-cli --scan --pattern "*"
```

---

## 6. Rotación de credenciales

### 6.1 Rotación JWT_SECRET

1. Generar nuevo secreto: `openssl rand -hex 64`
2. Actualizar en AWS Secrets Manager
3. Reiniciar API: `docker compose restart api`
4. **Efecto**: todos los tokens actuales quedan invalidados (usuarios deben re-login)

### 6.2 Rotación ENCRYPTION_KEY

> **ADVERTENCIA**: Rotar esta clave sin migrar los datos cifrados los hace irrecuperables.  
> Requiere script de re-cifrado. Contactar con el equipo de seguridad antes de proceder.

---

## 7. Diagnóstico de alertas Prometheus

### ApiLatencyHigh (p95 > 500ms)

```bash
# Ver queries lentas en PostgreSQL
docker compose exec postgres psql -U safework -d safework_db -c \
  "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Ver estado de conexiones
docker compose exec postgres psql -U safework -d safework_db -c \
  "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
```

### ApiErrorRateHigh (5xx > 1%)

```bash
# Últimos errores en logs
docker compose logs api --tail=200 | grep '"level":"ERROR"' | tail -20

# Ver trace_id de errores para correlacionar
docker compose logs api --tail=500 | jq 'select(.level=="ERROR") | {ts, message, trace_id, path}'
```

### ApiDown / RedisDown / PostgresDown

```bash
# Verificar estado del contenedor
docker compose ps

# Ver logs recientes del servicio caído
docker compose logs <servicio> --tail=100

# Reinicio forzado si el contenedor no responde
docker compose restart <servicio>
```

### DiskUsageHigh (> 80%)

```bash
# Ver uso de disco por directorio
du -sh /var/lib/docker/volumes/*

# Limpiar imágenes Docker no utilizadas
docker image prune -f

# Limpiar logs antiguos
find /var/log -name "*.log" -mtime +30 -delete
```

---

## 8. Certificados TLS

### Renovación (Let's Encrypt / certbot)

```bash
# Renovar manualmente
docker compose exec nginx certbot renew --nginx

# Los certificados se renuevan automáticamente via cron
# Verificar: crontab -l | grep certbot
```

### Verificar expiración

```bash
echo | openssl s_client -connect safework.es:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## 9. Monitoreo y acceso

| Servicio | URL | Credenciales |
|---|---|---|
| Grafana | http://monitor.safework.es | admin / ver Secrets Manager |
| Prometheus | Solo acceso interno (no expuesto) | — |
| Alertmanager | Solo acceso interno (no expuesto) | — |

---

## 10. Contactos de escalado

| Nivel | Contacto | Medio |
|---|---|---|
| L1 — Operaciones | ops@reker.es | Email / Slack |
| L2 — Desarrollo | pablo@reker.es | Email / Teléfono |
| L3 — AWS Support | console.aws.amazon.com | Caso de soporte |
| DPO (incidentes RGPD) | dpo@safework.es | Email cifrado |
