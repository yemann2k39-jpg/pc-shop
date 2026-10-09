import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Single-admin authentication for the /admin area.
 *
 * The password lives in ADMIN_PASSWORD (env). Sessions are stateless: a
 * cookie holds an expiry timestamp plus an HMAC-SHA256 signature of it,
 * keyed by ADMIN_SESSION_SECRET (falls back to the password itself).
 *
 * HMAC is implemented with Web Crypto so the same verification code runs
 * in Server Actions and in `src/proxy.ts` (Next 16's middleware).
 */

export const ADMIN_COOKIE = "pc_shop_admin_session";
/** Session lifetime: 12 hours. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

function sessionSecret(): string | null {
  const password = adminPassword();
  if (!password) return null;
  return process.env.ADMIN_SESSION_SECRET || password;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(message: string): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("Admin auth is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

/** Returns the signed session token for a fresh login, or null if auth is not configured. */
export async function createSessionToken(): Promise<string | null> {
  if (!adminPassword()) return null;
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${await sign(String(expiresAt))}`;
}

/** Validates a token's signature and expiry. Safe to call from proxy or server code. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  // Unconfigured auth never verifies: without a real secret no token can be
  // trusted (this also removes the hardcoded dev-secret forgery vector).
  if (!adminPassword() || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Date.now()) return false;
  const expected = await sign(expiresAt);
  // Constant-time-ish comparison over equal-length hex strings.
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Server-component/action helper: is the current request authenticated? */
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/** Guard for admin Server Actions: redirect out if the caller is not authed. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export function isAuthConfigured(): boolean {
  return Boolean(adminPassword());
}
