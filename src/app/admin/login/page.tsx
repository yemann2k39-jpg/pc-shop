import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata = { title: "Admin sign in" };

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/admin";
  return <LoginForm next={next} />;
}
