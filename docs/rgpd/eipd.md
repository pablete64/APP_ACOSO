# Evaluación de Impacto en la Protección de Datos (EIPD)

**SafeWork AI — Plataforma de prevención del acoso laboral**  
**Responsable**: REKER Tech Solutions S.L.  
**DPO**: Por designar — dpo@safework.es  
**Base legal**: Art. 35 RGPD; Directrices WP248 (EDPB); Lista AEPD (octubre 2019)  
**Revisión**: Mayo 2025  
**Estado**: Borrador — pendiente validación DPO

---

## 1. Necesidad de la EIPD

La EIPD es **obligatoria** para SafeWork AI por concurrir múltiples criterios del art. 35.3 RGPD y las Directrices WP248:

| Criterio WP248 | Aplica | Justificación |
|---|---|---|
| Evaluación o puntuación | Parcial | Clasificación de riesgo de denuncias por IA |
| Decisiones automáticas con efecto significativo | No | Todas las decisiones son revisadas por humanos |
| Monitorización sistemática | Sí | Encuestas clima continuas |
| Datos sensibles o de naturaleza muy personal | **Sí** | Relatos de acoso, represalias, expedientes disciplinarios |
| Datos a gran escala | Potencial | Proyección: decenas de miles de empleados en múltiples empresas |
| Combinación de datos | Sí | Cruce de datos formativos, denuncias y clima por empresa |
| Interesados vulnerables | **Sí** | Víctimas de acoso en situación de dependencia laboral |
| Uso de tecnologías innovadoras | Sí | IA generativa para análisis de denuncias |
| Imposibilidad de ejercer derechos | Riesgo | Anonimato absoluto limita derechos de acceso/rectificación |

Concurren **5 o más criterios** → EIPD obligatoria conforme a las directrices EDPB.

---

## 2. Descripción sistemática del tratamiento

### 2.1 Naturaleza del tratamiento

SafeWork AI procesa datos personales en el contexto de:

1. **Canal de denuncias** (Ley 2/2023): relatos de presuntas infracciones que pueden incluir datos de categoría especial (salud, vida sindical, infracciones penales)
2. **Gestión de expedientes disciplinarios**: identidad de las partes, documentación, resoluciones
3. **Análisis de clima laboral** con metodología FPSICO/INSST: aunque anonimizado, correlacionable en grupos pequeños
4. **Perfilado por IA**: el motor de IA clasifica el tipo y gravedad de la situación descrita

### 2.2 Flujo de datos simplificado

```
Trabajador → [E2E cifrado en browser] → API → BD cifrada (KMS)
                                              ↓
                                        AI Engine (solo metadatos, nunca relato en claro)
                                              ↓
                                        Gestor (descifra con clave denunciante)
```

La clave de descifrado del relato **nunca toca los servidores de REKER** — solo existe en el dispositivo del denunciante y se transmite directamente al gestor con permiso.

### 2.3 Partes implicadas

- **Responsable del tratamiento**: Empresa cliente (empleador)
- **Encargado del tratamiento**: REKER Tech Solutions S.L. (DPA art. 28)
- **Sub-encargado**: AWS EMEA SARL (infraestructura; cláusulas contractuales tipo)
- **Interesados**: trabajadores (denunciantes, investigados, testigos, pares de apoyo)

---

## 3. Evaluación de necesidad y proporcionalidad

| Objetivo | ¿Necesario? | ¿Proporcional? | Notas |
|---|---|---|---|
| Anonimato absoluto en denuncias | Sí | Sí | Requerido por Ley 2/2023 art. 8 |
| Conservación 10 años | Sí | Sí | Art. 24 Ley 2/2023; prescripción penal |
| Cifrado E2E sin acceso por REKER | Sí | Sí | Minimización + confidencialidad |
| IA para clasificación | Parcial | Sí con salvaguardas | Solo metadatos; decisión humana final |
| Encuestas clima agregadas | Sí | Sí con k-anonimato ≥5 | Interés legítimo |
| Logs 30-90 días | Sí | Sí | Seguridad del sistema; sin PII |

---

## 4. Identificación y valoración de riesgos

### R-01 — Reidentificación de denunciante anónimo

| Atributo | Valor |
|---|---|
| **Descripción** | Un atacante con acceso a los metadatos (IP, timing, correlación de eventos) puede identificar al denunciante aunque el relato esté cifrado |
| **Probabilidad sin medidas** | Media |
| **Impacto** | Muy alto (represalias, despido, daño psicológico) |
| **Riesgo residual** | Bajo |
| **Medidas** | Sin registro de IP en denuncias; sin user_id en tabla de respuestas de clima; código de seguimiento aleatorio criptográfico; no correlación entre tracking_code y usuario |

### R-02 — Acceso no autorizado a expedientes

| Atributo | Valor |
|---|---|
| **Descripción** | Un gestor, RRHH o administrador accede a expedientes que no le corresponden |
| **Probabilidad sin medidas** | Media |
| **Impacto** | Alto (violación confidencialidad, sesgo investigación) |
| **Riesgo residual** | Bajo |
| **Medidas** | RBAC granular por permiso; tenant isolation (schema PostgreSQL por empresa); audit log inmutable de accesos; sin acceso cross-tenant |

### R-03 — Brecha de datos masiva (ransomware / exfiltración)

| Atributo | Valor |
|---|---|
| **Descripción** | Atacante externo accede y exfiltra la base de datos completa |
| **Probabilidad sin medidas** | Baja |
| **Impacto** | Muy alto |
| **Riesgo residual** | Muy bajo |
| **Medidas** | Cifrado en reposo AES-256 (KMS con rotación anual); cifrado en tránsito TLS 1.3; red privada VPC (sin acceso directo a BD desde internet); RDS sin IP pública; backups cifrados con PITR 30 días; plan de respuesta a incidentes activo |

### R-04 — Uso indebido del sistema por el empleador

| Atributo | Valor |
|---|---|
| **Descripción** | La empresa cliente utiliza la plataforma para identificar denunciantes o victimizar a personas investigadas |
| **Probabilidad sin medidas** | Media |
| **Impacto** | Alto |
| **Riesgo residual** | Bajo |
| **Medidas** | Cifrado E2E impide que la empresa lea relatos sin la clave del denunciante; DPA contractual con obligaciones específicas; opt-out garantizado en mediación; registro de represalias cifrado |

### R-05 — Sesgos del motor de IA

| Atributo | Valor |
|---|---|
| **Descripción** | El modelo de IA clasifica incorrectamente situaciones, perjudicando al denunciante o al investigado |
| **Probabilidad sin medidas** | Media |
| **Impacto** | Medio |
| **Riesgo residual** | Bajo |
| **Medidas** | IA solo sugiere; clasificación final siempre humana; guardrails hardcoded (categorías de riesgo no delegables a IA); logging de todas las inferencias para auditoría; modelo evaluado por experto en derecho laboral antes de producción |

### R-06 — Ejercicio de derechos RGPD limitado (anonimato)

| Atributo | Valor |
|---|---|
| **Descripción** | El denunciante anónimo no puede ejercer derechos de acceso/supresión porque el sistema no le puede identificar |
| **Probabilidad** | Alta (inherente al diseño) |
| **Impacto** | Medio |
| **Riesgo residual** | Aceptado con salvaguarda |
| **Medidas** | El código de seguimiento actúa como pseudoidentificador; el denunciante puede solicitar la eliminación de su denuncia usando el código; documentado en política de privacidad |

---

## 5. Medidas adoptadas — resumen

| Categoría | Medida | Estado |
|---|---|---|
| Minimización | Sin registro de IP en denuncias | ✓ Implementado |
| Minimización | K-anonimato ≥5 en clima | ✓ Implementado |
| Cifrado | AES-256-GCM E2E para relatos | ✓ Implementado |
| Cifrado | RDS + S3 con KMS rotación anual | ✓ Implementado (Terraform) |
| Control de acceso | RBAC por permiso + tenant isolation | ✓ Implementado |
| Trazabilidad | Audit log inmutable + sello TSA | ✓ Implementado |
| Portabilidad | Exportación de expedientes con hash | ✓ Implementado |
| Incidentes | Plan de respuesta documentado | ✓ docs/operaciones/ |
| Contratos | DPA modelo firmable por clientes | ✓ landing/legal/dpa.astro |
| DPO | Designación formal | Pendiente |
| Pentest | Prueba de penetración externa | Pendiente |

---

## 6. Consulta previa a la AEPD

La EIPD concluye que el riesgo residual, tras la aplicación de las medidas descritas, es **bajo** y no requiere consulta previa a la AEPD (art. 36 RGPD).

No obstante, se recomienda revisar esta evaluación con el DPO una vez designado, y antes del despliegue del motor de IA en producción.

---

## 7. Plan de revisión

| Evento | Acción |
|---|---|
| Cambio significativo en el sistema | Revisión de la EIPD afectada |
| Nueva categoría de datos | Añadir tratamiento al RAT y revisar sección correspondiente |
| Incidente de seguridad | Actualizar evaluación de riesgo |
| Revisión periódica | Anualmente, o antes si hay cambios normativos |

Próxima revisión: **mayo 2026**
