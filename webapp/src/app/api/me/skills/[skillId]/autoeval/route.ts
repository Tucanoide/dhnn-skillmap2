import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ApiError, getCurrentUser } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  try {
    const user = getCurrentUser(request);
    const { skillId } = await params;
    const body = await request.json();
    const nivelActual = Number(body?.nivel_actual);
    if (!Number.isInteger(nivelActual) || nivelActual < 0 || nivelActual > 5) {
      throw new ApiError(400, "nivel_actual debe estar entre 0 y 5");
    }
    const rows = await query(
      `UPDATE person_skills SET nivel_actual = $1, autoeval_fecha = CURRENT_DATE
       WHERE person_id = $2 AND skill_id = $3 RETURNING id`,
      [nivelActual, user.sub, skillId]
    );
    if (!rows.length) throw new ApiError(404, "Ese skill no está asignado a tu perfil");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
