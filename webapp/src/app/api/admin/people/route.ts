import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const rows = await query<Record<string, unknown>>(
      `SELECT p.*, l.nombre AS lider_nombre
       FROM people p LEFT JOIN people l ON l.id = p.lider_id
       ORDER BY p.nombre`
    );
    for (const r of rows) delete r.password_hash;
    return NextResponse.json(rows);
  } catch (err) {
    return handleError(err);
  }
}

interface PersonBody {
  nombre: string;
  email: string;
  rol_puesto: string;
  area: string;
  banda: string;
  seniority?: string | null;
  lider_id?: number | null;
  es_admin?: boolean;
  notas?: string | null;
  tipo?: string;
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body: PersonBody = await request.json();
    const tipo = body.tipo || "interno";
    if (!["interno", "freelance"].includes(tipo)) {
      throw new ApiError(400, "tipo debe ser interno o freelance");
    }
    const row = await queryOne<{ id: number }>(
      `INSERT INTO people (nombre, email, rol_puesto, area, banda, seniority, lider_id, es_admin, notas, tipo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        body.nombre,
        body.email?.toLowerCase(),
        body.rol_puesto,
        body.area,
        body.banda,
        body.seniority ?? null,
        body.lider_id ?? null,
        body.es_admin ?? false,
        body.notas ?? null,
        tipo,
      ]
    );
    return NextResponse.json({ id: row?.id });
  } catch (err) {
    if (err instanceof ApiError) return handleError(err);
    return NextResponse.json({ detail: (err as Error).message }, { status: 400 });
  }
}
