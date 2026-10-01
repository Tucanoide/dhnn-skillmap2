import { NextResponse } from "next/server";
import { GOOGLE_CLIENT_ID } from "@/lib/auth";

// Config pública para el frontend estático (nada de esto es secreto: el Client ID
// de Google está diseñado para viajar al navegador).
export async function GET() {
  return NextResponse.json({ google_client_id: GOOGLE_CLIENT_ID });
}
