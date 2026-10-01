import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const url = new URL(request.url);
    const incluirInactivas = url.searchParams.get("incluir_inactivas") === "true";
    const rows = incluirInactivas
      ? await query("SELECT * FROM skills ORDER BY categoria, nombre")
      : await query("SELECT * FROM skills WHERE activo ORDER BY categoria, nombre");
    return NextResponse.json(rows);
  } catch (err) {
    return handleError(err);
  }
}

interface SkillBody {
  nombre: string;
  categoria: string;
  tipo: string;
  activo?: boolean;
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body: SkillBody = await request.json();
    if (!["dura", "blanda", "ia"].includes(body.tipo)) {
      throw new ApiError(400, "tipo debe ser dura, blanda o ia");
    }
    const row = await queryOne<{ id: number }>(
      "INSERT INTO skills (nombre, categoria, tipo, activo) VALUES ($1,$2,$3,$4) RETURNING id",
      [body.nombre, body.categoria, body.tipo, body.activo ?? true]
    );
    return NextResponse.json({ id: row?.id });
  } catch (err) {
    if (err instanceof ApiError) return handleError(err);
    return NextResponse.json({ detail: (err as Error).message }, { status: 400 });
  }
}
