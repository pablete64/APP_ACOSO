# SafeWork AI

Plataforma B2B2E de prevención y gestión del acoso laboral — canal de denuncias cifrado, expedientes con sello TSA, IA asistente y cumplimiento Ley 2/2023.

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x
- [Make](https://www.gnu.org/software/make/) (preinstalado en macOS y Linux)
- Archivo `.env` configurado (ver paso 1)

---

## Arrancar

npm run demo1   # Construcciones Vega — denuncia activa, clima deteriorado

npm run demo2   # Finanzas Meridian — expedientes cerrados, KPIs en verde

npm run demo3   # TechStart — empresa nueva, onboarding inicial

npm run demo4   # Distribuciones Norte — mediación en curso, represalia cifrada

## 4 escenarios de demo

| SEED | Empresa | Escenario |
|------|---------|-----------|
| `1` | Construcciones Vega S.L. | Denuncia activa de acoso sexual · Plazo vencido · Clima deteriorado |
| `2` | Finanzas Meridian S.A. | Dos expedientes cerrados · Formación 100% · KPIs en verde |
| `3` | TechStart Solutions SLU | Empresa nueva · Sin denuncias · Onboarding inicial |
| `4` | Distribuciones Norte S.A. | Mediación en curso · Par de apoyo · Represalia cifrada |

Para cambiar de escenario: `make demo SEED=2` (borra la BD y arranca limpio).

---

## Credenciales (todos los seeds)

La contraseña es la misma para todos: **`Demo1234!`**

Cada seed tiene un dominio diferente. Para **Seed 1** (Vega):

| Email | Perfil | Acceso a |
|-------|--------|----------|
| `trabajador@vega.es` | Trabajador | Canal de denuncia, formación, clima, apoyo |
| `igualdad@vega.es` | Responsable de Igualdad | Expedientes, mediaciones, reportes |
| `rrhh@vega.es` | RRHH / Legal | Expedientes, denuncias, gestión |
| `director@vega.es` | Dirección | Dashboard ejecutivo, KPIs, exportación |
| `inspector@vega.es` | Inspector | Vista de solo lectura con trazabilidad |

Sustituye `@vega.es` por el dominio del seed elegido:

| Seed | Dominio |
|------|---------|
| 1 | `@vega.es` |
| 2 | `@meridian.es` |
| 3 | `@techstart.es` |
| 4 | `@dnorte.es` |

---

## URLs

| Servicio | URL |
|----------|-----|
| Aplicación web | http://localhost:3000 |
| Landing page | http://localhost:4321 |
| API (docs Swagger) | http://localhost:8000/docs |
| Base de datos (Adminer) | http://localhost:8888 |
| Email (Mailhog) | http://localhost:8025 |

---

## Comandos útiles

```bash
make logs          # logs en tiempo real
make ps            # estado de los contenedores
make stop          # para sin borrar datos
make clean         # para y borra todos los datos
```