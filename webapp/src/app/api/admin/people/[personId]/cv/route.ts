import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { query, queryOne } from "@/lib/db";
import { ApiError, requireAdmin } from "@/lib/auth";
import { extractSkillsFromCv } from "@/lib/team-builder";
import { handleError } from "@/lib/api-helpers";

const CV_UPLOAD_DIR = path.join(process.cwd(), "uploads", "cvs");

export async function GET(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  try {
    requireAdmin(request);
    const { personId } = await params;
    const row = await queryOne<{ archivo_nombre: string }>(
      "SELECT archivo_nombre FROM people_cv WHERE person_id=$1",
      [personId]
    );
    if (!row) throw new ApiError(404, "Esta persona todavía no tiene un CV subido");
    const buf = await readFile(path.join(CV_UPLOAD_DIR, `${personId}.pdf`));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${row.archivo_nombre.replace(/"/g, "")}"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  try {
    requireAdmin(request);
    const { personId } = await params;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Falta el archivo");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) throw new ApiError(400, "El CV debe ser un PDF");

    const raw = Buffer.from(await file.arrayBuffer());
    if (!raw.length) throw new ApiError(400, "El archivo está vacío");

    const person = await queryOne("SELECT id FROM people WHERE id=$1", [personId]);
    if (!person) throw new ApiError(404, "Persona no encontrada");

    const skillsCatalog = await query<{ id: number; nombre: string; categoria: string; tipo: string }>(
      "SELECT id, nombre, categoria, tipo FROM skills ORDER BY categoria, nombre"
    );
    if (!skillsCatalog.length) throw new ApiError(400, "Todavía no hay catálogo de skills cargado");

    const pdfBase64 = raw.toString("base64");
    let result;
    try {
      result = await extractSkillsFromCv(pdfBase64, skillsCatalog);
    } catch (e) {
      if ((e as Error).message?.includes("ANTHROPIC_API_KEY")) {
        throw new ApiError(500, "Falta configurar ANTHROPIC_API_KEY en el .env");
      }
      throw new ApiError(502, `Error consultando la IA: ${(e as Error).message}`);
    }

    await mkdir(CV_UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(CV_UPLOAD_DIR, `${personId}.pdf`), raw);

    await query(
      `INSERT INTO people_cv (person_id, archivo_nombre, texto_extraido)
       VALUES ($1, $2, $3)
       ON CONFLICT (person_id) DO UPDATE SET archivo_nombre=EXCLUDED.archivo_nombre,
           texto_extraido=EXCLUDED.texto_extraido, creado_en=now()`,
      [personId, file.name, result.resumen || ""]
    );

    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
