import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "admsbc_session";
const SESSION_DAYS = 7;

function getSecret(): string {
  const secret = process.env.APP_PASSWORD;
  if (!secret) throw new Error("APP_PASSWORD não configurada");
  return secret;
}

function sign(timestamp: string): string {
  return createHmac("sha256", getSecret()).update(`admsbc:${timestamp}`).digest("hex");
}

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordIsValid(value: string): boolean {
  return same(value, getSecret());
}

export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  return `${timestamp}.${sign(timestamp)}`;
}

export function sessionMaxAge(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}

export async function isAuthenticated(): Promise<boolean> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return false;
  const [timestamp, signature] = value.split(".");
  if (!timestamp || !signature || !same(signature, sign(timestamp))) return false;
  const age = Date.now() - Number(timestamp);
  return Number.isFinite(age) && age >= 0 && age < sessionMaxAge() * 1000;
}
