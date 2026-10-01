import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_ALG = "HS256";
const TOKEN_TTL_HOURS = 24 * 7;
const ALLOWED_DOMAIN = "dhnn.com";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function verifyGoogleCredential(credential: string): Promise<string> {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Token de Google inválido");
  }
  if (!payload) throw new ApiError(401, "Token de Google inválido");
  const email = (payload.email || "").toLowerCase();
  if (payload.hd !== ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new ApiError(401, `Solo se permite login con cuentas @${ALLOWED_DOMAIN}`);
  }
  if (!payload.email_verified) {
    throw new ApiError(401, "Email de Google no verificado");
  }
  return email;
}

export interface PersonRow {
  id: number;
  nombre: string;
  email: string;
  banda: string;
  es_admin: boolean;
  [key: string]: unknown;
}

export interface TokenUser {
  sub: number;
  email: string;
  nombre: string;
  es_lider: boolean;
  es_admin: boolean;
}

export function createToken(person: PersonRow): string {
  const payload = {
    sub: String(person.id),
    email: person.email,
    nombre: person.nombre,
    es_lider: person.banda === "Management" || person.banda === "Lead",
    es_admin: person.es_admin,
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: JWT_ALG, expiresIn: `${TOKEN_TTL_HOURS}h` });
}

export function decodeToken(token: string): TokenUser {
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALG] }) as jwt.JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "Sesión expirada, volvé a iniciar sesión");
    }
    throw new ApiError(401, "Token inválido");
  }
  return {
    sub: parseInt(String(decoded.sub), 10),
    email: decoded.email,
    nombre: decoded.nombre,
    es_lider: decoded.es_lider,
    es_admin: decoded.es_admin,
  };
}

export function getCurrentUser(request: Request): TokenUser {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) throw new ApiError(401, "Falta iniciar sesión");
  return decodeToken(match[1]);
}

export function requireAdmin(request: Request): TokenUser {
  const user = getCurrentUser(request);
  if (!user.es_admin) throw new ApiError(403, "Requiere rol admin (People)");
  return user;
}
