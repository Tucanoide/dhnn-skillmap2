import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

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

export async function PUT(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  try {
    requireAdmin(request);
    const { personId } = await params;
    const body: PersonBody = await request.json();
    const tipo = body.tipo || "interno";
    if (!["interno", "freelance"].includes(tipo)) {
      throw new ApiError(400, "tipo debe ser interno o freelance");
    }
    const rows = await query(
      `UPDATE people SET nombre=$1, email=$2, rol_puesto=$3, area=$4, banda=$5,
              seniority=$6, lider_id=$7, es_admin=$8, notas=$9, tipo=$10
       WHERE id=$11 RETURNING id`,
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
        personId,
      ]
    );
    if (!rows.length) throw new ApiError(404, "Persona no encontrada");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  try {
    requireAdmin(request);
    const { personId } = await params;
    const rows = await query("DELETE FROM people WHERE id=$1 RETURNING id", [personId]);
    if (!rows.length) throw new ApiError(404, "Persona no encontrada");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
