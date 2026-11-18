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

/** A friendly emoji for an activity name, matched by keyword. Falls back to a generic one. */
export function activityEmoji(activity: string): string {
  const a = activity.toLowerCase();
  if (/walk|steps|hike/.test(a)) return "🚶";
  if (/run|jog/.test(a)) return "🏃";
  if (/squat|lunge|leg/.test(a)) return "🦵";
  if (/knee|band/.test(a)) return "🎗️";
  if (/breath|meditat|yoga/.test(a)) return "🧘";
  if (/stretch/.test(a)) return "🤸";
  if (/cycl|bike/.test(a)) return "🚴";
  if (/swim/.test(a)) return "🏊";
  if (/weight|lift|gym|push|pull/.test(a)) return "🏋️";
  return "💪";
}

export type DayTotal = { date: string; minutes: number };

/** Minutes per day (all users, or one user) for the 7 days ending on `today`, oldest first. */
export function dailyMinutes(rows: WorkoutRow[], today: string, userId?: string): DayTotal[] {
  const days: DayTotal[] = [];
  for (let i = 6; i >= 0; i--) days.push({ date: shiftDate(today, -i), minutes: 0 });
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const row of rows) {
    if (row.unit !== "min") continue;
    if (userId && row.userId !== userId) continue;
    const day = byDate.get(row.occurredOn);
    if (day) day.minutes += row.amount;
  }
  return days;
}

/**
 * Consecutive days (ending today, or yesterday if nothing is logged yet today)
 * on which `userId` logged at least one entry of any kind.
 */
export function currentStreak(rows: WorkoutRow[], today: string, userId: string): number {
  const dates = new Set(rows.filter((r) => r.userId === userId).map((r) => r.occurredOn));
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** Weekly minutes target per person. */
export const WEEKLY_GOAL_MIN = 150;

/** Progress toward a goal as a whole percent, capped at 100. */
export function goalPercent(minutes: number, goal: number = WEEKLY_GOAL_MIN): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((minutes / goal) * 100));
}

export type ActivityTotal = { activity: string; minutes: number; count: number };

/**
 * Most-done activities over the last 7 days, by entry count then minutes.
 * Names are grouped case-insensitively; the first spelling seen is displayed.
 */
export function topActivities(
  rows: (WorkoutRow & { activity: string })[],
  today: string,
  limit = 4,
): ActivityTotal[] {
  const from = shiftDate(today, -6);
  const groups = new Map<string, ActivityTotal>();
  for (const row of rows) {
    if (row.occurredOn < from || row.occurredOn > today) continue;
    const key = row.activity.trim().toLowerCase();
    const g = groups.get(key) ?? { activity: row.activity.trim(), minutes: 0, count: 0 };
    g.count += 1;
    if (row.unit === "min") g.minutes += row.amount;
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.minutes - a.minutes)
    .slice(0, limit);
}
