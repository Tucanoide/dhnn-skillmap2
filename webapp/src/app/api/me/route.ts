import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ApiError, getCurrentUser } from "@/lib/auth";
import { fetchPersonSkills, handleError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const user = getCurrentUser(request);
    const persona = await queryOne(
      "SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id, tipo FROM people WHERE id=$1",
      [user.sub]
    );
    if (!persona) throw new ApiError(404, "Persona no encontrada");
    const skills = await fetchPersonSkills(user.sub);
    return NextResponse.json({ persona, skills });
  } catch (err) {
    return handleError(err);
  }
}
