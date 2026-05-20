# ============================================================
# SafeWork AI — Makefile
# ============================================================
.DEFAULT_GOAL := help
SHELL         := /bin/bash
COMPOSE_DIR   := infrastructure/docker
COMPOSE_BASE  := $(COMPOSE_DIR)/docker-compose.yml
COMPOSE_DEV   := $(COMPOSE_DIR)/docker-compose.dev.yml
COMPOSE_PROD  := $(COMPOSE_DIR)/docker-compose.prod.yml
ENV_FILE      := .env
ENV_EXAMPLE   := .env.example

# Puertos que SafeWork AI usa (para liberar antes de arrancar)
SAFEWORK_PORTS := 3000 4321 8000 8001 8080 5432 6379 80 443

.PHONY: help demo setup reset dev prod stop ps down logs kill-ports clean nuke \
        test lint typecheck build migrate seed

# ─── AYUDA ───────────────────────────────────────────────────────────────────

help: ## Muestra esta ayuda
	@awk 'BEGIN {FS = ":.*##"; printf "\n\033[1mSafeWork AI — comandos disponibles\033[0m\n\n"} \
	  /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# ─── DEMO CON DATOS DE PRUEBA ────────────────────────────────────────────────

demo: ## make demo [SEED=1|2|3|4]  — arranca todo con datos precargados
	@SEED=$${SEED:-1}; \
	case "$$SEED" in \
	  1) SFILE="database/seeds/s01_crisis_denuncia.sql"  ;; \
	  2) SFILE="database/seeds/s02_resuelto_maduro.sql"  ;; \
	  3) SFILE="database/seeds/s03_empresa_nueva.sql"    ;; \
	  4) SFILE="database/seeds/s04_mediacion_activa.sql" ;; \
	  *) echo "❌ SEED inválido. Usa SEED=1, 2, 3 o 4." && exit 1 ;; \
	esac; \
	echo "→ Seed S0$$SEED: $$SFILE"; \
	cp "$$SFILE" database/init/01_seed.sql
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) --env-file $(ENV_FILE) down -v 2>/dev/null || true
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) --env-file $(ENV_FILE) up --build -d
	@echo ""
	@echo "✅ SafeWork AI corriendo con Seed S0$${SEED:-1}"
	@echo "   App       → http://localhost:3000"
	@echo "   Landing   → http://localhost:4321"
	@echo "   API docs  → http://localhost:8000/docs"
	@echo "   BD        → http://localhost:8888  (Adminer: user=safework)"
	@echo "   Email     → http://localhost:8025  (Mailhog)"

# ─── SETUP INICIAL ───────────────────────────────────────────────────────────

setup: ## Configura el entorno desde cero (primera vez)
	@echo "🔧 SafeWork AI — Setup inicial"
	@$(MAKE) _check-docker
	@$(MAKE) _copy-env
	@echo "📦 Instalando dependencias Node..."
	@pnpm install
	@echo "🐳 Levantando servicios (dev)..."
	@$(MAKE) dev
	@echo "🗄️  Ejecutando migraciones..."
	@$(MAKE) migrate
	@echo "🌱 Ejecutando seeds de ejemplo..."
	@$(MAKE) seed
	@echo ""
	@echo "✅ Setup completado — SafeWork AI corriendo en http://localhost:3000"
	@echo "   Panel de BD:  http://localhost:8888 (Adminer)"
	@echo "   Correos dev:  http://localhost:8025 (Mailhog)"

# ─── ARRANQUE ────────────────────────────────────────────────────────────────

dev: ## Levanta el stack completo en modo desarrollo
	docker compose \
	  -f $(COMPOSE_BASE) \
	  -f $(COMPOSE_DEV) \
	  --env-file $(ENV_FILE) \
	  up --build -d
	@echo "✅ Stack dev arriba — http://localhost:3000"

prod: ## Levanta el stack en modo producción
	docker compose \
	  -f $(COMPOSE_BASE) \
	  -f $(COMPOSE_PROD) \
	  --env-file $(ENV_FILE) \
	  up --build -d
	@echo "✅ Stack prod arriba"

stop: ## Para los contenedores conservando datos
	docker compose \
	  -f $(COMPOSE_BASE) \
	  -f $(COMPOSE_DEV) \
	  --env-file $(ENV_FILE) \
	  stop

ps: ## Estado de todos los contenedores
	docker compose \
	  -f $(COMPOSE_BASE) \
	  -f $(COMPOSE_DEV) \
	  --env-file $(ENV_FILE) \
	  ps

down: ## Para todos los contenedores
	docker compose \
	  -f $(COMPOSE_BASE) \
	  -f $(COMPOSE_DEV) \
	  --env-file $(ENV_FILE) \
	  down

logs: ## Muestra logs en tiempo real (todos los servicios)
	docker compose \
	  -f $(COMPOSE_BASE) \
	  -f $(COMPOSE_DEV) \
	  --env-file $(ENV_FILE) \
	  logs -f

# ─── PUERTOS ─────────────────────────────────────────────────────────────────

kill-ports: ## Libera los puertos de SafeWork AI antes de arrancar
	@echo "🔫 Liberando puertos: $(SAFEWORK_PORTS)"
	@for port in $(SAFEWORK_PORTS); do \
	  pids=$$(lsof -ti tcp:$$port 2>/dev/null); \
	  if [ -n "$$pids" ]; then \
	    echo "   Puerto $$port ocupado por PID $$pids — terminando..."; \
	    echo $$pids | xargs kill -9 2>/dev/null || true; \
	  fi; \
	done
	@echo "   ✓ Puertos libres"

# ─── BASE DE DATOS ───────────────────────────────────────────────────────────

migrate: ## Ejecuta las migraciones SQL pendientes
	@echo "🗄️  Ejecutando migraciones..."
	@docker exec safework_postgres psql \
	  -U $${DATABASE_USER:-safework} \
	  -d $${DATABASE_NAME:-safework_db} \
	  -f /docker-entrypoint-initdb.d/001_init.sql 2>/dev/null || true
	@for f in database/migrations/*.sql; do \
	  echo "   Aplicando $$f..."; \
	  docker exec safework_postgres psql \
	    -U $${DATABASE_USER:-safework} \
	    -d $${DATABASE_NAME:-safework_db} \
	    -f /migrations/$$(basename $$f) 2>/dev/null || true; \
	done
	@echo "   ✓ Migraciones aplicadas"

seed: ## Carga datos de ejemplo (empresa demo + usuario demo)
	@echo "🌱 Cargando seeds..."
	@for f in database/seeds/*.sql; do \
	  echo "   Ejecutando $$f..."; \
	  docker exec safework_postgres psql \
	    -U $${DATABASE_USER:-safework} \
	    -d $${DATABASE_NAME:-safework_db} \
	    < $$f 2>/dev/null || true; \
	done
	@echo "   ✓ Seeds cargados"

# ─── RESET ───────────────────────────────────────────────────────────────────

reset: ## ⚠️  Destruye la BD y la reconstruye limpia (datos locales borrados)
	@echo "⚠️  ADVERTENCIA: Esto borrará TODOS los datos locales."
	@read -p "¿Confirmas? Escribe 'reset' para continuar: " confirm; \
	  [ "$$confirm" = "reset" ] || (echo "Cancelado." && exit 1)
	@echo "🛑 Parando contenedores..."
	@$(MAKE) down
	@echo "🗑️  Borrando volúmenes..."
	docker volume rm safework_postgres_data safework_redis_data 2>/dev/null || true
	@echo "🔧 Reconstruyendo..."
	@$(MAKE) dev
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "✅ Reset completado"

nuke: ## ☢️  Elimina contenedores, volúmenes e imágenes de SafeWork AI
	@echo "☢️  NUKE: Elimina TODO (imágenes incluidas)."
	@read -p "¿Confirmas? Escribe 'nuke' para continuar: " confirm; \
	  [ "$$confirm" = "nuke" ] || (echo "Cancelado." && exit 1)
	@$(MAKE) down
	docker compose \
	  -f $(COMPOSE_BASE) \
	  -f $(COMPOSE_DEV) \
	  down --volumes --rmi all 2>/dev/null || true
	@echo "✅ Limpieza completa"

clean: ## Limpia artefactos de build (node_modules, .next, __pycache__, etc.)
	@echo "🧹 Limpiando artefactos..."
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name ".next" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name ".turbo" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name "__pycache__" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name "target" -path "*/case-management/target" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	@echo "✅ Limpieza completada"

# ─── CALIDAD DE CÓDIGO ───────────────────────────────────────────────────────

lint: ## Ejecuta linters (ESLint + Ruff + Checkstyle)
	pnpm turbo lint
	docker exec safework_api ruff check app/ || true
	docker exec safework_case_mgmt mvn checkstyle:check -q || true

typecheck: ## Comprueba tipos (TypeScript + mypy)
	pnpm turbo typecheck
	docker exec safework_api mypy app/ || true

test: ## Ejecuta todos los tests
	pnpm turbo test
	docker exec safework_api pytest --tb=short || true
	docker exec safework_case_mgmt mvn test -q || true

build: ## Construye todos los paquetes
	pnpm turbo build

# ─── HELPERS PRIVADOS ────────────────────────────────────────────────────────

_check-docker:
	@command -v docker >/dev/null 2>&1 || \
	  (echo "❌ Docker no está instalado. Visita https://docs.docker.com/get-docker/" && exit 1)
	@docker info >/dev/null 2>&1 || \
	  (echo "❌ Docker no está corriendo. Arráncalo y vuelve a intentarlo." && exit 1)
	@command -v pnpm >/dev/null 2>&1 || \
	  (echo "❌ pnpm no está instalado. Ejecuta: npm install -g pnpm" && exit 1)

_copy-env:
	@if [ ! -f $(ENV_FILE) ]; then \
	  echo "📋 Copiando $(ENV_EXAMPLE) → $(ENV_FILE)..."; \
	  cp $(ENV_EXAMPLE) $(ENV_FILE); \
	  echo "   ⚠️  Revisa $(ENV_FILE) y rellena los valores reales antes de continuar."; \
	fi
