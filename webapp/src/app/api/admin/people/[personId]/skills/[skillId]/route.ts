import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

interface ModifyAssignBody {
  bucket: string;
  nivel_objetivo: number;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ personId: string; skillId: string }> }
) {
  try {
    requireAdmin(request);
    const { personId, skillId } = await params;
    const body: ModifyAssignBody = await request.json();
    if (!["core", "blandas", "desarrollar"].includes(body.bucket)) {
      throw new ApiError(400, "bucket debe ser core, blandas o desarrollar");
    }
    const rows = await query(
      "UPDATE person_skills SET bucket=$1, nivel_objetivo=$2 WHERE person_id=$3 AND skill_id=$4 RETURNING id",
      [body.bucket, body.nivel_objetivo, personId, skillId]
    );
    if (!rows.length) throw new ApiError(404, "Asignación no encontrada");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ personId: string; skillId: string }> }
) {
  try {
    requireAdmin(request);
    const { personId, skillId } = await params;
    const rows = await query(
      "DELETE FROM person_skills WHERE person_id=$1 AND skill_id=$2 RETURNING id",
      [personId, skillId]
    );
    if (!rows.length) throw new ApiError(404, "Asignación no encontrada");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
