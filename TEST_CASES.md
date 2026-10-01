# DHNN SkillMap - Casos de prueba

Plan operativo para ejecutar cuando estén configurados PostgreSQL, `.env`, Google OAuth y Anthropic. ClickUp queda pausado. El ecosistema de partners es una vista CRM visual/operativa, no comercial.

## Preparación local

```bash
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8420
python3 -m http.server 8000 --directory app
```

Smoke check:

```bash
curl -i http://127.0.0.1:8420/health
```

Debe devolver HTTP 200 y `{"status":"ok"}`.

## Datos de prueba

- `EMP-01`: empleado con skills.
- `EMP-02`: empleado sin permisos de líder ni admin.
- `LID-01`: líder con dos reportes directos.
- `ADM-01`: usuario People/admin.
- `PAR-01`: partner freelance con CV PDF válido.
- `PAR-02`: partner sin CV o sin skills.
- `SK-01`: skill existente.
- `SK-NEW`: skill creada durante la prueba.
- `CV-VALID`: PDF legible con experiencia relacionada al catálogo.
- `CV-INVALID`: archivo no PDF, vacío o ilegible.

## Base de datos y migraciones

| ID | Caso | Resultado esperado |
|---|---|---|
| DB-001 | Ejecutar `schema.sql` en base vacía | Crea `people`, `skills`, `person_skills` y `people_cv` |
| DB-002 | Ejecutar `schema_auth.sql` | Agrega auth, `tipo`, constraint y permisos sin error |
| DB-003 | Ejecutar `migrate_schema_alignment.sql` sobre base existente | Alinea la base sin borrar datos |
| DB-004 | Ejecutar las migraciones dos veces | La segunda ejecución es idempotente |
| DB-005 | Insertar tipos `interno` y `freelance` | Ambos se aceptan |
| DB-006 | Insertar un tipo inválido | La base lo rechaza |
| DB-007 | Guardar dos CV para una persona | Se conserva un único CV vigente |
| DB-008 | Borrar persona con skills y CV | Se eliminan relaciones por cascade |
| DB-009 | Usar la app con `skillmapuser` | Tiene los permisos necesarios y no más |

## Autenticación

| ID | Caso | Resultado esperado |
|---|---|---|
| AUTH-001 | `GET /health` | HTTP 200 |
| AUTH-002 | Login Google con cuenta DHNN registrada | Devuelve JWT y sesión |
| AUTH-003 | Cuenta fuera de `@dhnn.com` | HTTP 401 |
| AUTH-004 | Cuenta Google válida pero fuera del roster | HTTP 401 |
| AUTH-005 | `GET /me` sin token | HTTP 401 |
| AUTH-006 | Token inválido o modificado | HTTP 401 |
| AUTH-007 | Token expirado | HTTP 401 y redirección al login |
| AUTH-008 | Recargar página autenticado | Conserva sesión |
| AUTH-009 | Cerrar sesión | Limpia localStorage y vuelve a login |

## Dashboard y autoevaluación

| ID | Caso | Resultado esperado |
|---|---|---|
| DASH-001 | EMP-01 abre dashboard | Solo ve su perfil y skills |
| DASH-002 | Persona sin skills | Muestra estado vacío sin error |
| DASH-003 | Cambiar nivel a 0, 1 y 5 | Guarda nivel y fecha |
| DASH-004 | Enviar nivel menor que 0 o mayor que 5 | HTTP 400 |
| DASH-005 | Autoevaluar skill no asignada | HTTP 404 |
| DASH-006 | Cargar skills de varios buckets | Radar actual/objetivo correcto |
| DASH-007 | Filtrar Core, Blandas y A desarrollar | Lista correcta por bucket |
| DASH-008 | Skill sin fecha o antigua | Muestra aviso de revisión |

## Equipo y permisos

| ID | Caso | Resultado esperado |
|---|---|---|
| TEAM-001 | LID-01 abre equipo | Ve solo reportes directos |
| TEAM-002 | EMP-02 abre equipo | HTTP 403 |
| TEAM-003 | Líder abre reporte propio | Puede ver skills |
| TEAM-004 | Líder abre persona ajena | HTTP 403 |
| TEAM-005 | Líder valida skill | Guarda fecha de validación |
| TEAM-006 | Validar con `ajustar=false` | No cambia nivel actual |
| TEAM-007 | Validar con `ajustar=true` | Cambia nivel y marca ajuste |
| TEAM-008 | ADM-01 abre equipo | Puede ver todas las personas |

## Administración de personas y skills

| ID | Caso | Resultado esperado |
|---|---|---|
| PEOPLE-001 | Listar personas como admin | No expone `password_hash` |
| PEOPLE-002 | Crear persona interna | Se guarda `tipo=interno` |
| PEOPLE-003 | Crear partner | Se guarda `tipo=freelance` y aparece en ecosistema |
| PEOPLE-004 | Email duplicado | Error y no duplica |
| PEOPLE-005 | Editar persona | Actualiza rol, área y seniority |
| PEOPLE-006 | Eliminar persona | Elimina relaciones asociadas |
| PEOPLE-007 | EMP-02 llama `/admin/*` | HTTP 403 |
| PEOPLE-008 | Líder inexistente | La base rechaza la relación |
| SKILL-001 | Listar catálogo | Skills ordenadas por categoría |
| SKILL-002 | Crear `SK-NEW` | Se crea |
| SKILL-003 | Tipo de skill inválido | HTTP 400 |
| SKILL-004 | Nombre/categoría duplicados | Error de unicidad |
| SKILL-005 | Asignar skill | Se crea asignación |
| SKILL-006 | Reasignar bucket/objetivo | Actualiza sin duplicar |
| SKILL-007 | Objetivo 0 o 6 | Se rechaza |
| SKILL-008 | Quitar asignación | Desaparece del perfil |
| SKILL-009 | Skills overview | Contadores coinciden con DB |

## Ecosistema de partners

| ID | Caso | Resultado esperado |
|---|---|---|
| PARTNER-001 | Abrir `ecosistema.html` como admin | Tabla y contador visibles |
| PARTNER-002 | Buscar por nombre, email, rol o área | Filtra correctamente |
| PARTNER-003 | Filtrar por área | Solo muestra el área elegida |
| PARTNER-004 | Filtrar estado visual | Activo, Para revisar y Sin perfil funcionan |
| PARTNER-005 | Alta manual | Partner aparece en la tabla |
| PARTNER-006 | Alta duplicada | Error y no duplica |
| PARTNER-007 | Editar partner | Actualiza la fila |
| PARTNER-008 | Subir `CV-VALID` | Guarda CV y devuelve skills detectadas |
| PARTNER-009 | Subir `CV-INVALID` | Error claro, sin guardar archivo inválido |
| PARTNER-010 | Reemplazar CV | Actualiza CV vigente, sin duplicar perfil |
| PARTNER-011 | Revisar skills IA | Solo guarda skills seleccionadas y niveles elegidos |
| PARTNER-012 | Abrir partner sin skills | Estado vacío, sin error |
| PARTNER-013 | Vista móvil | Tabla desplazable y acciones utilizables |

## IA: CV y armado de equipos

| ID | Caso | Resultado esperado |
|---|---|---|
| AI-001 | Falta `ANTHROPIC_API_KEY` | Error controlado de configuración |
| AI-002 | Catálogo vacío | HTTP 400 |
| AI-003 | `skill_id` inexistente en respuesta IA | No se guarda skill inválida |
| AI-004 | Respuesta IA incompleta | Error controlado, sin datos parciales |
| AI-005 | Analizar `CV-VALID` | Solo skills del catálogo |
| AI-006 | Team builder con brief válido | Devuelve resumen, equipo y gaps |
| AI-007 | Brief vacío | HTTP 400 |
| AI-008 | Pool interno + freelance | Usa personas reales del roster |
| AI-009 | Pool sin skills | HTTP 400 |
| AI-010 | Brief con skill no cubierta | Informa gap |

## Frontend y regresión

| ID | Caso | Resultado esperado |
|---|---|---|
| UI-001 | Abrir `index.html` | Muestra o redirige al login |
| UI-002 | Abrir páginas protegidas sin sesión | Vuelven al login |
| UI-003 | Backend detenido | Muestra error visible |
| UI-004 | Navegar por sidebar | Solo muestra opciones del rol |
| UI-005 | Formularios incompletos | Valida campos y muestra feedback |
| UI-006 | Desktop 1440px | Sin solapamientos |
| UI-007 | Mobile 390px | Contenido usable |
| UI-008 | Ejecutar `python3 scripts/bump_cache_version.py` | Actualiza hashes de CSS/API |

## Criterios de salida

Para la primera versión deben pasar DB, AUTH, DASH, TEAM, PEOPLE, SKILL, PARTNER y UI. Los casos AI deben pasar o quedar explícitamente marcados como segunda etapa. ClickUp permanece fuera de alcance.

## Registro

| Fecha | Casos | Resultado | Evidencia | Responsable |
|---|---|---|---|---|
| 2026-09-24 | Preparación del plan | Listo para ejecutar | Este documento | |
