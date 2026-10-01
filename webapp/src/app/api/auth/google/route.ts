import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ApiError, createToken, verifyGoogleCredential, type PersonRow } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const credential = body?.credential;
    if (!credential) throw new ApiError(400, "Falta el credential de Google");

    const email = await verifyGoogleCredential(credential);
    const person = await queryOne<PersonRow>("SELECT * FROM people WHERE email = $1", [email]);
    if (!person) throw new ApiError(401, "Ese email no está en el roster de DHNN");

    const token = createToken(person);
    return NextResponse.json({
      token,
      nombre: person.nombre,
      es_lider: person.banda === "Management" || person.banda === "Lead",
      es_admin: person.es_admin,
    });
  } catch (err) {
    return handleError(err);
  }
}
