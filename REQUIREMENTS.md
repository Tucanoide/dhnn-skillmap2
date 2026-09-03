# DHNN · Mapa de Habilidades — Requerimientos (v1)

Documento de especificación (spec-first). Nada de esto se construye hasta
que esté validado acá.

## 1. Objetivo

Una herramienta interna para que **todas las personas de DHNN** mapeen sus
habilidades, sus líderes las validen, y la compañía pueda armar equipos de
proyecto basándose en skills reales (no en memoria/intuición), con ayuda de IA.

## 2. Usuarios y permisos

| Rol | Puede ver | Puede hacer |
|---|---|---|
| **Empleado/a** | Su propio mapa de habilidades | Autoevaluarse (nivel actual por skill) |
| **Líder** | Su propio mapa + el de su equipo directo | Validar/ajustar la autoevaluación de su equipo, iniciar armado de equipo por IA |
| **People** (admin) | Todo | Gestionar categorías y skills, dar de alta nuevas personas |

- Cada persona tiene **un único líder/manager** (estructura simple, sin doble reporte).
- Cualquier líder puede iniciar el armado de equipo por IA — no está limitado a People/PMs.

## 3. Datos

**Ficha de persona:**
nombre, rol, área, seniority, líder asignado, email (@dhnn.com, es el
identificador de login).

**Categorías y skills:**
No están fijas en el código — People las define y edita (para cubrir
diseño, tech, business, finance, admin, liderazgo, etc., no solo roles
de producto/diseño como en el mockup de referencia).

Cada skill tiene, por persona:
- Nivel actual (1–5: Aprendiz → Maestro)
- Nivel objetivo (1–5, según su rol)
- Última autoevaluación (fecha)
- Última validación del líder (fecha, y si hubo ajuste)

**Disponibilidad / carga de trabajo:**
Se calcula integrando con **ClickUp**: se suman las **horas estimadas en
tareas activas** asignadas a cada persona. Esto alimenta al armado de
equipos por IA (no solo mira skills, también cuánto lugar tiene cada
persona hoy).

## 4. Flujos principales

1. **Autoevaluación:** la persona completa/actualiza su nivel en cada skill.
2. **Validación:** su líder revisa y ajusta si corresponde.
3. **Alta de nueva persona:** People crea la ficha inicial (rol, área,
   líder). La persona completa su primera autoevaluación como parte de su
   onboarding — buen lugar para engancharlo al checklist de
   [dhnn-onboarding](../dhnn-onboarding) más adelante.
4. **Armado de equipo por IA:** un líder escribe el brief del proyecto en
   texto libre → el sistema cruza los skills requeridos (que la IA infiere
   del brief) contra el mapa de habilidades de todas las personas + su
   disponibilidad actual en ClickUp → devuelve una sugerencia de equipo
   con justificación (por qué esa persona, qué skill cubre, qué tan
   disponible está).

## 5. Vistas (inspiradas visualmente en el mockup de referencia)

- **Dashboard personal:** hero con datos propios, tiles por categoría,
  radar comparando nivel actual vs. objetivo, brechas prioritarias, plan
  de desarrollo (modelo 70/20/10).
- **Vista de equipo (líderes):** el mismo dashboard, navegable por cada
  persona de su equipo, con acción para validar/ajustar niveles.
- **Armado de equipos con IA:** campo de texto para el brief + resultado
  con las personas sugeridas y el porqué.
- **Admin (People):** alta de personas, gestión de categorías/skills.

Paleta y layout: se mantiene el estilo del mockup de referencia (fondo
claro tipo dataviz, sidebar + topbar, tarjetas, gráfico radar con
Chart.js) — es una herramienta interna distinta al onboarding, no
necesita la identidad amarillo/negro de ese sitio.

## 5.1 Aclaración: liderazgo de Design y PM

En un primer momento pareció haber co-liderazgo entre Sabrina García
Demestre y Lucas Davison sobre Design y PM. Se confirmó que **no es
así**: Lucas es el CEO (tope del organigrama), pero la líder directa de
esos equipos es **Sabrina García Demestre**. Se mantiene el modelo
original de la sección 2 (un único líder/manager por persona) — no hace
falta rediseñar el esquema de permisos.

Los roles de Management/Chapter Lead (Diego Trefny, Juan Pablo Da Rocha,
Rocío Doukler, María Julia Murua, Sabrina García Demestre, Pedro
Astelarra, Melisa Fernández, Rocio Castillo) son las áreas de Shared
Services/Dirección, y reportan directamente a **Lucas Davison (CEO)**.

## 6. Stack técnico

- **Frontend:** HTML/CSS/JS plano, sin build (mismo criterio que los
  otros proyectos de DHNN) + Chart.js vía CDN para el radar.
- **Backend:** Postgres propio (VPS, `72.61.219.217`), **no Supabase**.
  - Ya migrado: schema (`schema.sql`) + datos reales del roster y la
    estructura de skills (`migrate_data.py`) — ver tablas `people`,
    `skills`, `person_skills`.
  - Credenciales en `.env` (nunca en git): `skillmapdba` (admin, crea/
    altera tablas) y `skillmapuser` (uso normal de la app, permisos
    limitados vía `GRANT`).
  - **Pendiente de decidir** (al no tener Supabase, se pierden 3 cosas
    que daba gratis y hay que resolver aparte):
    1. **Auth** — Supabase daba login con Google restringido a
       @dhnn.com. Sin eso, hay que elegir un proveedor de auth o
       construir uno.
    2. **Capa de API** — el frontend no puede conectarse directo a
       Postgres con estas credenciales (quedarían expuestas en el
       navegador). Hace falta algo en el medio: un servidor propio, o
       algo como PostgREST autohospedado sobre esta misma base.
    3. **Permisos por rol** (sección 2: empleado ve lo suyo, líder ve
       su equipo, People ve todo) — Supabase lo resolvía con Row Level
       Security atado a `auth.uid()`. Sin Supabase Auth, hay que
       aplicar esos permisos en la capa de API en vez de en la base.
- **Hosting:** a definir.

## 7. Lo que necesito de vos para arrancar a construir

1. **Taxonomía inicial de skills** — un punto de partida por área
   (diseño, tech, business, finance, admin, liderazgo). Puedo proponer
   un borrador para que ajustes, si preferís arrancar de una lista en
   vez de una hoja en blanco.
2. **Token de API de ClickUp** (personal o de la cuenta) y el/los
   espacios o listas relevantes — para poder leer las horas estimadas
   por persona. Lo generás vos desde ClickUp (Configuración → Apps →
   API Token); yo no puedo crear ese acceso.
3. **Confirmar el listado real de líderes y sus equipos** (quién
   reporta a quién) — hoy tengo el organigrama que armamos en Cultura,
   pero no sé si está completo/actualizado para todo el mapeo de skills.
4. Cuando estemos por conectar el login: **credenciales de Google OAuth**
   (mismo proceso que documentamos para Mi Contrato — Google Cloud
   Console + habilitarlo en Supabase).

## 8. Fuera de alcance de la v1 (a futuro)

- Reportes agregados a nivel compañía (ej. "brechas de skill más comunes
  en toda DHNN").
- Historial/tendencia de crecimiento de una persona a lo largo del tiempo.
- Notificaciones automáticas (ej. avisar al líder cuando alguien se
  autoevalúa y queda pendiente de validar).
