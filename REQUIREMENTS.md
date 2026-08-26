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

## 5.1 Actualización: co-liderazgo (cambia la sección 2)

Al levantar el roster real apareció un caso de **co-liderazgo**: los
equipos de Design y PM tienen dos líderes directos en conjunto (Sabrina
García Demestre y Lucas Davison), no uno solo. Esto contradice la
decisión original de la sección 2 ("un único líder/manager").

**Impacto técnico:** el modelo de permisos (RLS) tiene que soportar
"líder → múltiples personas" y también "persona → múltiples líderes",
en vez de una relación 1 a 1. No es un cambio grande (una tabla de
relación en vez de una columna `lider_id`), pero hay que decidirlo antes
de diseñar el esquema. Pendiente de confirmación con Melisa antes de
avanzar al esquema de base de datos.

## 6. Stack técnico

- **Frontend:** HTML/CSS/JS plano, sin build (mismo criterio que los
  otros proyectos de DHNN) + Chart.js vía CDN para el radar.
- **Backend:** Supabase
  - Auth: login con Google, restringido a @dhnn.com.
  - Postgres + Row Level Security: aplica los permisos de la sección 2
    (cada uno ve lo suyo / su equipo / todo, según rol).
  - Edge Functions (2): una llama a la **API de Claude** (arma el
    equipo sugerido), otra llama a la **API de ClickUp** (trae horas
    activas por persona). Ambas mantienen sus claves secretas del lado
    del servidor — nunca viajan al navegador.
- **Hosting:** a definir cuando esté listo para publicar (cualquier
  hosting estático + el proyecto de Supabase).

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
