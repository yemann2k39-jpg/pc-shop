import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/account-auth";

import { SignupForm } from "./signup-form";

export const metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  if (await getCurrentUser()) {
    redirect("/build");
  }
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/build";
  return <SignupForm next={next} />;
}
