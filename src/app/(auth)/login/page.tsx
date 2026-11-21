import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/account-auth";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  if (await getCurrentUser()) {
    redirect("/build");
  }
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/build";
  return <LoginForm next={next} />;
}
