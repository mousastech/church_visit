import { cookies } from "next/headers";
import {
  createSessionToken,
  isAuthenticated,
  passwordIsValid,
  SESSION_COOKIE,
  sessionMaxAge,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ authenticated: await isAuthenticated() });
}

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!passwordIsValid(password)) {
    return Response.json({ error: "Senha incorreta." }, { status: 401 });
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge(),
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return Response.json({ ok: true });
}
