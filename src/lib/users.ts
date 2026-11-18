import { db, schema } from "@/db";

/** Create the user row on first sign-in, or refresh the name on later sign-ins. */
export async function ensureUser(email: string, name?: string | null) {
  const [row] = await db
    .insert(schema.users)
    .values({ email: email.toLowerCase(), name: name ?? null })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { name: name ?? null },
    })
    .returning();
  if (!row) throw new Error("Could not create the user record.");
  return row;
}
