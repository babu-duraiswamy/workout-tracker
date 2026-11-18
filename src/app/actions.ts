"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { workoutInputSchema } from "@/lib/workouts";

export type AddState = { error?: string; ok?: boolean };

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function addWorkout(_prev: AddState, formData: FormData): Promise<AddState> {
  const userId = await currentUserId();
  if (!userId) return { error: "Your session has expired. Please sign in again." };

  const parsed = workoutInputSchema.safeParse({
    activity: formData.get("activity"),
    amount: formData.get("amount"),
    unit: formData.get("unit"),
    occurredOn: formData.get("occurredOn"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db.insert(schema.workouts).values({ ...parsed.data, userId });
  revalidatePath("/");
  return { ok: true };
}

/** Anyone signed in can see the shared log, but only the person who logged an entry can remove it. */
export async function deleteWorkout(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  if (!z.uuid().safeParse(id).success) return;

  await db
    .delete(schema.workouts)
    .where(and(eq(schema.workouts.id, id), eq(schema.workouts.userId, userId)));
  revalidatePath("/");
}
