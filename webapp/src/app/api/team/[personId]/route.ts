import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ApiError, getCurrentUser } from "@/lib/auth";
import { canViewPerson, fetchPersonSkills, handleError } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  try {
    const user = getCurrentUser(request);
    const { personId } = await params;
    const persona = await queryOne(
      "SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id, tipo FROM people WHERE id=$1",
      [personId]
    );
    if (!persona) throw new ApiError(404, "Persona no encontrada");
    if (!canViewPerson(user, persona as { lider_id?: number | null })) {
      throw new ApiError(403, "No podés ver a esta persona");
    }
    const skills = await fetchPersonSkills(Number(personId));
    return NextResponse.json({ persona, skills });
  } catch (err) {
    return handleError(err);
  }
}
