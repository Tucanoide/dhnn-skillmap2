import Anthropic from "@anthropic-ai/sdk";

const MODEL = (process.env.ANTHROPIC_MODEL || "claude-opus-5").trim();
const WORKSPACE_ID = (process.env.ANTHROPIC_WORKSPACE_ID || "").trim();

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Falta configurar ANTHROPIC_API_KEY en el .env");
    }
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: WORKSPACE_ID ? { "anthropic-workspace-id": WORKSPACE_ID } : undefined,
    });
  }
  return client;
}

const TEAM_SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "string", description: "Resumen de 1-2 frases del criterio usado para armar el equipo." },
    equipo: {
      type: "array",
      items: {
        type: "object",
        properties: {
          person_id: { type: "integer" },
          nombre: { type: "string" },
          tipo: { type: "string", enum: ["interno", "freelance"] },
          rol_en_equipo: { type: "string" },
          justificacion: { type: "string" },
        },
        required: ["person_id", "nombre", "tipo", "rol_en_equipo", "justificacion"],
        additionalProperties: false,
      },
    },
    gaps: {
      type: "string",
      description: "Habilidades que pide el brief y el roster no cubre bien. Vacío si no hay gaps.",
    },
  },
  required: ["resumen", "equipo", "gaps"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Sos un asistente que arma equipos de proyecto para la agencia DHNN a partir de:
1. El pool completo de personas disponibles — tanto el equipo interno de DHNN como partners/freelancers del
   "Ecosistema de partners" (campo "tipo": "interno" o "freelance") — con sus habilidades y el nivel actual
   en cada una (escala 0 a 5, 0 = sin autoevaluar, 5 = maestro). Cuando una habilidad fue validada (campo
   "validado") es más confiable que una autoevaluación o una estimación por CV sin validar.
2. Un brief de proyecto en texto libre, escrito por un administrador.

Elegí las personas del pool (usando exactamente su person_id, nunca inventes personas que no estén en la
lista) que mejor cubran lo que pide el brief, priorizando nivel_actual alto en las skills relevantes y, a
igual nivel, las validadas. Combiná libremente gente interna y freelance según lo que más convenga al
proyecto — no hay preferencia por defecto entre unos y otros, solo el fit de habilidades. Si el brief no
aclara el tamaño del equipo, proponé uno razonable según el alcance descripto. Para cada persona elegida
explicá en una frase por qué encaja (qué skill y nivel la hacen apta, o su rol/banda si aplica). Señalá en
"gaps" si el pool no cubre bien alguna necesidad del brief; dejalo vacío si no hay gaps relevantes.`;

interface Persona {
  id: number;
  nombre: string;
  tipo?: string;
  rol_puesto: string;
  area: string;
  banda: string;
  seniority?: string | null;
}

interface Skill {
  nombre: string;
  categoria: string;
  nivel_actual: number;
  nivel_objetivo: number;
  lider_validacion_fecha: string | null;
}

interface PersonWithSkills {
  persona: Persona;
  skills: Skill[];
}

function buildRosterPayload(peopleWithSkills: PersonWithSkills[]) {
  return peopleWithSkills.map(({ persona, skills }) => ({
    person_id: persona.id,
    nombre: persona.nombre,
    tipo: persona.tipo || "interno",
    rol_puesto: persona.rol_puesto,
    area: persona.area,
    banda: persona.banda,
    seniority: persona.seniority ?? null,
    skills: skills.map((s) => ({
      nombre: s.nombre,
      categoria: s.categoria,
      nivel_actual: s.nivel_actual,
      nivel_objetivo: s.nivel_objetivo,
      validado: Boolean(s.lider_validacion_fecha),
    })),
  }));
}

function firstText(content: Anthropic.ContentBlock[]): string {
  const block = content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("La IA no devolvió una respuesta de texto");
  return block.text;
}

export async function suggestTeam(brief: string, peopleWithSkills: PersonWithSkills[]) {
  const roster = buildRosterPayload(peopleWithSkills);
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: TEAM_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Roster disponible (JSON):\n${JSON.stringify(roster)}\n\nBrief del proyecto:\n${brief}`,
      },
    ],
  });
  return JSON.parse(firstText(response.content));
}

const CV_SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "string", description: "Resumen de 1-2 frases del perfil de la persona según el CV." },
    skills_detectadas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill_id: { type: "integer" },
          nombre: { type: "string" },
          nivel_estimado: { type: "integer", description: "0 a 5, según evidencia en el CV." },
          evidencia: { type: "string", description: "Frase corta del CV que justifica el nivel." },
        },
        required: ["skill_id", "nombre", "nivel_estimado", "evidencia"],
        additionalProperties: false,
      },
    },
  },
  required: ["resumen", "skills_detectadas"],
  additionalProperties: false,
};

const CV_SYSTEM_PROMPT = `Sos un asistente que lee CVs para armar el perfil de habilidades de freelancers y
partners del ecosistema de DHNN. Se te da el catálogo completo de skills disponibles (con su skill_id) y
el texto de un CV. Detectá qué skills del catálogo esa persona demuestra tener, usando SOLO skill_id que
existan en el catálogo dado (nunca inventes un skill_id ni una skill fuera de esa lista). Para cada skill
detectada, estimá un nivel de 0 a 5 según la evidencia del CV (años de experiencia, seniority de los roles,
tecnologías mencionadas, logros) — sé conservador, no asumas nivel 5 salvo evidencia clara de dominio senior.
Si el CV no da evidencia suficiente de una skill del catálogo, no la incluyas. Citá una frase corta del CV
como evidencia de cada una.`;

interface SkillCatalogItem {
  id: number;
  nombre: string;
  categoria: string;
  tipo: string;
}

export async function extractSkillsFromCv(pdfBase64: string, skillsCatalog: SkillCatalogItem[]) {
  const catalogPayload = skillsCatalog.map((s) => ({
    skill_id: s.id,
    nombre: s.nombre,
    categoria: s.categoria,
    tipo: s.tipo,
  }));
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: CV_SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: CV_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: `Catálogo de skills disponibles (JSON):\n${JSON.stringify(catalogPayload)}` },
        ],
      },
    ],
  });
  return JSON.parse(firstText(response.content));
}
