import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const row = await queryOne<{ sin_autoevaluar: string; cubiertas: string; a_desarrollar: string }>(
      `SELECT
         count(*) FILTER (WHERE ps.nivel_actual = 0) AS sin_autoevaluar,
         count(*) FILTER (WHERE ps.nivel_actual > 0 AND ps.nivel_actual >= ps.nivel_objetivo) AS cubiertas,
         count(*) FILTER (WHERE ps.nivel_actual > 0 AND ps.nivel_actual < ps.nivel_objetivo) AS a_desarrollar
       FROM person_skills ps
       JOIN skills s ON s.id = ps.skill_id
       WHERE s.activo`
    );
    return NextResponse.json({
      sin_autoevaluar: Number(row?.sin_autoevaluar ?? 0),
      cubiertas: Number(row?.cubiertas ?? 0),
      a_desarrollar: Number(row?.a_desarrollar ?? 0),
    });
  } catch (err) {
    return handleError(err);
  }
}
