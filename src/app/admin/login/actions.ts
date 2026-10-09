"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, SESSION_TTL_MS, createSessionToken } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const safeNext = next.startsWith("/admin") ? next : "/admin";
  const expected = process.env.ADMIN_PASSWORD ?? "";

  if (!expected) {
    return { error: "Admin access is not configured. Set ADMIN_PASSWORD in .env.local and restart the server." };
  }
  if (!password || password !== expected) {
    return { error: "Incorrect password." };
  }

  const token = await createSessionToken();
  if (!token) {
    return { error: "Could not create a session. Try again." };
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  redirect(safeNext);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
