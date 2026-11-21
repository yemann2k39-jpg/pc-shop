/**
 * Shop-user credentials auth with database-backed sessions (server-only).
 *
 * Distinct from the single-admin auth in lib/auth.ts: customers get real
 * accounts in the `users` table.
 *
 * - Passwords: scrypt (node:crypto) with a per-user random salt, stored as
 *   "scrypt:<saltHex>:<hashHex>" — no external dependency needed.
 * - Sessions: a 256-bit random token stored in the sessions table; the
 *   browser only ever sees the token inside an httpOnly cookie, so the
 *   cookie can be revoked server side by deleting the row.
 */
import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

const scrypt = promisify(scryptCb);

export const ACCOUNT_COOKIE = "pc_shop_account";
/** 30 days. */
const ACCOUNT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, salt, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hashHex) return false;
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

/** Creates a user with a hashed password. Returns null if email is taken. */
export async function createUser(
  email: string,
  name: string,
  password: string,
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  if (existing.length > 0) return null;
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email: normalized, name: name.trim(), passwordHash })
    .returning();
  return user;
}

/** Verifies credentials. Returns the user or null. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

/** Creates a session row and sets the httpOnly cookie. */
export async function createAccountSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ACCOUNT_TTL_MS);
  await db.insert(sessions).values({ id: token, userId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
    // Local demo runs over plain http; flip on when deployed behind TLS.
    secure: process.env.COOKIE_SECURE === "true",
  });
}

/** Deletes the session row and clears the cookie. */
export async function destroyAccountSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCOUNT_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, token));
  }
  cookieStore.delete(ACCOUNT_COOKIE);
}

/** The logged-in shop user, or null. Server components/actions only. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.user ?? null;
}
