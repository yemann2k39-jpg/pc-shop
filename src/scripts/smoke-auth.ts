/** Temporary TCK-36 smoke check: auth helpers against the real DB. */
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createUser, hashPassword, verifyCredentials, verifyPassword } from "@/lib/account-auth";

async function main() {
  const email = `smoke-${Date.now()}@test.dev`;
  const u = await createUser(email, "Smoke Tester", "correct horse battery");
  if (!u) throw new Error("createUser returned null");
  const again = await createUser(email, "Dup", "x");
  if (again !== null) throw new Error("duplicate email not rejected");
  const good = await verifyCredentials(email.toUpperCase() + " ", "correct horse battery");
  if (!good || good.id !== u.id) throw new Error("verifyCredentials failed for valid creds");
  const bad = await verifyCredentials(email, "wrong");
  if (bad !== null) throw new Error("verifyCredentials accepted bad password");
  const h = await hashPassword("abc");
  if (!(await verifyPassword("abc", h))) throw new Error("hash/verify mismatch");
  const row = (await db.select().from(users).where(eq(users.id, u.id)))[0];
  if (!row.passwordHash.startsWith("scrypt:")) throw new Error("password not hashed");
  await db.delete(users).where(eq(users.id, u.id));
  console.log("AUTH-SMOKE-OK user", u.id, row.email);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
