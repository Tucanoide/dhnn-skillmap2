import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { ApiError, getCurrentUser } from "@/lib/auth";
import { canViewPerson, handleError } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ personId: string; skillId: string }> }
) {
  try {
    const user = getCurrentUser(request);
    const { personId, skillId } = await params;
    const body = await request.json();
    const nivelActual = Number(body?.nivel_actual);
    const ajustar = Boolean(body?.ajustar ?? false);
    if (!Number.isInteger(nivelActual) || nivelActual < 0 || nivelActual > 5) {
      throw new ApiError(400, "nivel_actual debe estar entre 0 y 5");
    }

    const person = await queryOne<{ lider_id: number | null }>("SELECT lider_id FROM people WHERE id=$1", [personId]);
    if (!person) throw new ApiError(404, "Persona no encontrada");
    if (!canViewPerson(user, person)) throw new ApiError(403, "No podés validar a esta persona");

    const rows = await query(
      `UPDATE person_skills
       SET lider_validacion_fecha = CURRENT_DATE, lider_ajusto = $1,
           nivel_actual = CASE WHEN $1 THEN $2 ELSE nivel_actual END
       WHERE person_id = $3 AND skill_id = $4
       RETURNING id`,
      [ajustar, nivelActual, personId, skillId]
    );
    if (!rows.length) throw new ApiError(404, "Ese skill no está asignado a esa persona");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
