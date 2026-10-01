import { Pool, types, type QueryResultRow } from "pg";

// Igual que psycopg2 (que usamos antes), las columnas DATE deben llegar al
// frontend como texto plano "YYYY-MM-DD", no como Date (que además corre
// riesgo de correrse un día por timezone).
types.setTypeParser(types.builtins.DATE, (val: string) => val);

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL_skillmapuser;
    if (!url) throw new Error("Falta DATABASE_URL_skillmapuser en el entorno");
    pool = new Pool({ connectionString: url.split("?")[0] });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
