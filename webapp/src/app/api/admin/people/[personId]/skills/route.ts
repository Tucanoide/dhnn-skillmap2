import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { fetchPersonSkills, handleError } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  try {
    requireAdmin(request);
    const { personId } = await params;
    const skills = await fetchPersonSkills(Number(personId));
    return NextResponse.json(skills);
  } catch (err) {
    return handleError(err);
  }
}

interface AssignSkillBody {
  skill_id: number;
  bucket: string;
  nivel_objetivo?: number;
}

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  try {
    requireAdmin(request);
    const { personId } = await params;
    const body: AssignSkillBody = await request.json();
    if (!["core", "blandas", "desarrollar"].includes(body.bucket)) {
      throw new ApiError(400, "bucket debe ser core, blandas o desarrollar");
    }
    const row = await queryOne<{ id: number }>(
      `INSERT INTO person_skills (person_id, skill_id, bucket, nivel_objetivo)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (person_id, skill_id) DO UPDATE SET bucket=EXCLUDED.bucket, nivel_objetivo=EXCLUDED.nivel_objetivo
       RETURNING id`,
      [personId, body.skill_id, body.bucket, body.nivel_objetivo ?? 3]
    );
    return NextResponse.json({ id: row?.id });
  } catch (err) {
    if (err instanceof ApiError) return handleError(err);
    return NextResponse.json({ detail: (err as Error).message }, { status: 400 });
  }
}
