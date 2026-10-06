import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ApiError, getCurrentUser } from "@/lib/auth";
import { fetchPersonSkills, handleError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const user = getCurrentUser(request);
    const persona = await queryOne(
      `SELECT p.id, p.nombre, p.email, p.rol_puesto, p.area, p.banda, p.seniority, p.lider_id, p.tipo, l.nombre AS lider_nombre
       FROM people p LEFT JOIN people l ON l.id = p.lider_id
       WHERE p.id=$1`,
      [user.sub]
    );
    if (!persona) throw new ApiError(404, "Persona no encontrada");
    const skills = await fetchPersonSkills(user.sub);
    return NextResponse.json({ persona, skills });
  } catch (err) {
    return handleError(err);
  }
}
