import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

interface SkillBody {
  nombre: string;
  categoria: string;
  tipo: string;
  activo?: boolean;
}

export async function PUT(request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  try {
    requireAdmin(request);
    const { skillId } = await params;
    const body: SkillBody = await request.json();
    const rows = await query(
      "UPDATE skills SET nombre=$1, categoria=$2, tipo=$3, activo=$4 WHERE id=$5 RETURNING id",
      [body.nombre, body.categoria, body.tipo, body.activo ?? true, skillId]
    );
    if (!rows.length) throw new ApiError(404, "Skill no encontrado");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  try {
    requireAdmin(request);
    const { skillId } = await params;
    const rows = await query("DELETE FROM skills WHERE id=$1 RETURNING id", [skillId]);
    if (!rows.length) throw new ApiError(404, "Skill no encontrado");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
