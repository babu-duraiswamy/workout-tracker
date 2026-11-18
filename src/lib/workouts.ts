/**
 * Pure workout logic. No database or framework imports, so it is unit-tested directly.
 */
import { z } from "zod";

export const UNITS = ["min", "reps"] as const;
export type Unit = (typeof UNITS)[number];

export type QuickPick = {
  label: string;
  activity: string;
  amount: number;
  unit: Unit;
};

export const QUICK_PICKS: QuickPick[] = [
  { label: "Walking 15 min", activity: "Walking", amount: 15, unit: "min" },
  { label: "Squats 10 min", activity: "Squats", amount: 10, unit: "min" },
  { label: "Knee band 10 reps", activity: "Resistance band (knee)", amount: 10, unit: "reps" },
  { label: "Breathing 5 min", activity: "Breathing exercises", amount: 5, unit: "min" },
  { label: "Workout 5 min", activity: "Workout", amount: 5, unit: "min" },
  { label: "Stretching 10 min", activity: "Stretching", amount: 10, unit: "min" },
];

export const workoutInputSchema = z.object({
  activity: z
    .string()
    .trim()
    .min(1, "Add an activity name.")
    .max(80, "Keep the activity name under 80 characters."),
  amount: z.coerce
    .number({ error: "Enter an amount." })
    .int("Use a whole number.")
    .min(1, "Enter an amount above zero.")
    .max(999, "That amount is too large."),
  unit: z.enum(UNITS, { error: "Pick min or reps." }),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
});

export type WorkoutInput = z.infer<typeof workoutInputSchema>;

/** Today's calendar date in IST, as "YYYY-MM-DD". */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Shift a "YYYY-MM-DD" date by whole days. Pure calendar arithmetic, no timezone. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

export type WorkoutRow = {
  userId: string;
  amount: number;
  unit: Unit;
  occurredOn: string;
};

/** Minutes per person for the 7 days ending on `today` (inclusive). Reps are not summed. */
export function weeklyMinutesByUser(rows: WorkoutRow[], today: string): Map<string, number> {
  const from = shiftDate(today, -6);
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.unit !== "min") continue;
    if (row.occurredOn < from || row.occurredOn > today) continue;
    totals.set(row.userId, (totals.get(row.userId) ?? 0) + row.amount);
  }
  return totals;
}
