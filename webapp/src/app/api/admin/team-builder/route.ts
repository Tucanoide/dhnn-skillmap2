import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { fetchPersonSkills, handleError } from "@/lib/api-helpers";
import { suggestTeam } from "@/lib/team-builder";

interface Persona {
  id: number;
  nombre: string;
  rol_puesto: string;
  area: string;
  banda: string;
  seniority: string | null;
  tipo: string;
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const brief = (body?.brief || "").trim();
    if (!brief) throw new ApiError(400, "Falta el brief del proyecto");

    const people = await query<Persona>(
      "SELECT id, nombre, rol_puesto, area, banda, seniority, tipo FROM people ORDER BY nombre"
    );
    const peopleWithSkills = [];
    for (const persona of people) {
      const skills = await fetchPersonSkills(persona.id);
      if (skills.length) peopleWithSkills.push({ persona, skills });
    }
    if (!peopleWithSkills.length) {
      throw new ApiError(400, "No hay personas con skills cargadas todavía");
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await suggestTeam(brief, peopleWithSkills as any);
      return NextResponse.json(result);
    } catch (e) {
      if ((e as Error).message?.includes("ANTHROPIC_API_KEY")) {
        throw new ApiError(500, "Falta configurar ANTHROPIC_API_KEY en el .env");
      }
      throw new ApiError(502, `Error consultando la IA: ${(e as Error).message}`);
    }
  } catch (err) {
    return handleError(err);
  }
}
