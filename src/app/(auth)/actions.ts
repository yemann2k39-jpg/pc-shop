"use server";

import { redirect } from "next/navigation";

import { createAccountSession, createUser, destroyAccountSession, verifyCredentials } from "@/lib/account-auth";

export type AccountFormState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(rawNext: string | undefined): string {
  // Only allow same-site relative paths starting with a single slash.
  if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    return rawNext;
  }
  return "/build";
}

export async function signupAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (name.length < 2 || name.length > 80) {
    return { error: "Please enter your name (2–80 characters)." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const user = await createUser(email, name, password);
  if (!user) {
    return { error: "An account with this email already exists. Try signing in." };
  }
  await createAccountSession(user.id);
  redirect(next);
}

export async function loginAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  const user = await verifyCredentials(email, password);
  if (!user) {
    return { error: "Wrong email or password." };
  }
  await createAccountSession(user.id);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroyAccountSession();
  redirect("/");
}
