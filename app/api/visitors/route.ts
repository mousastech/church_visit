import { neon } from "@neondatabase/serverless";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
const OWNER_ID = "admsbc";
type VisitorInput = { name?: unknown; phone?: unknown; visitDate?: unknown; service?: unknown; notes?: unknown; approved?: unknown };
const bad = (message: string, status = 400) => Response.json({ error: message }, { status });

function sqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  return neon(url);
}

let schemaReady: Promise<unknown> | null = null;
async function db() {
  const sql = sqlClient();
  schemaReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      visit_date TEXT NOT NULL,
      service TEXT NOT NULL,
      notes TEXT,
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_visitors_owner_date ON visitors (owner_id, visit_date)`;
  })();
  await schemaReady;
  return sql;
}

function validate(v: VisitorInput) {
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const visitDate = typeof v.visitDate === "string" ? v.visitDate : "";
  const service = typeof v.service === "string" ? v.service.trim() : "";
  const phone = typeof v.phone === "string" ? v.phone.trim() : "";
  const notes = typeof v.notes === "string" ? v.notes.trim() : "";
  if (!name || name.length > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || !service || service.length > 80 || phone.length > 40 || notes.length > 500) return null;
  return { name, visitDate, service, phone, notes, approved: v.approved === true };
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return bad("Acesso não autorizado.", 401);
  const date = new URL(request.url).searchParams.get("date");
  try {
    const sql = await db();
    const rows = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? await sql`SELECT id, name, phone, visit_date AS "visitDate", service, notes, approved, created_at AS "createdAt" FROM visitors WHERE owner_id = ${OWNER_ID} AND visit_date = ${date} ORDER BY created_at DESC`
      : await sql`SELECT id, name, phone, visit_date AS "visitDate", service, notes, approved, created_at AS "createdAt" FROM visitors WHERE owner_id = ${OWNER_ID} ORDER BY visit_date DESC, created_at DESC LIMIT 500`;
    return Response.json({ visitors: rows });
  } catch (error) {
    console.error("Visitors load failed", error);
    return bad("Não foi possível carregar os visitantes. Confira o banco de dados.", 503);
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return bad("Acesso não autorizado.", 401);
  let input: VisitorInput;
  try { input = await request.json(); } catch { return bad("Dados inválidos."); }
  const visitor = validate(input);
  if (!visitor) return bad("Confira nome, data e culto. Os campos estão incompletos ou excederam o limite.");
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    const sql = await db();
    await sql`INSERT INTO visitors (id, owner_id, name, phone, visit_date, service, notes, approved, created_at) VALUES (${id}, ${OWNER_ID}, ${visitor.name}, ${visitor.phone}, ${visitor.visitDate}, ${visitor.service}, ${visitor.notes}, ${visitor.approved}, ${createdAt})`;
    return Response.json({ id, ...visitor, createdAt }, { status: 201 });
  } catch (error) {
    console.error("Visitor save failed", error);
    return bad("Não foi possível salvar. Tente novamente.", 503);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return bad("Acesso não autorizado.", 401);
  let input: { id?: unknown; approved?: unknown };
  try { input = await request.json(); } catch { return bad("Dados inválidos."); }
  if (typeof input.id !== "string" || typeof input.approved !== "boolean") return bad("Dados inválidos.");
  try {
    const sql = await db();
    const rows = await sql`UPDATE visitors SET approved = ${input.approved} WHERE id = ${input.id} AND owner_id = ${OWNER_ID} RETURNING id`;
    if (!rows.length) return bad("Visitante não encontrado.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Visitor update failed", error);
    return bad("Não foi possível atualizar.", 503);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) return bad("Acesso não autorizado.", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("ID ausente.");
  try {
    const sql = await db();
    const rows = await sql`DELETE FROM visitors WHERE id = ${id} AND owner_id = ${OWNER_ID} RETURNING id`;
    if (!rows.length) return bad("Visitante não encontrado.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Visitor delete failed", error);
    return bad("Não foi possível excluir.", 503);
  }
}
