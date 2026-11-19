/**
 * Pure workout logic. No database or framework imports, so it is unit-tested directly.
 */
import { z } from "zod";

export const UNITS = ["min", "reps"] as const;
export type Unit = (typeof UNITS)[number];

export type ActivityOption = {
  /** Shown on the tile. */
  label: string;
  /** Saved with the entry. Kept stable so older entries group with new ones. */
  activity: string;
  /** Unit pre-selected when the tile is tapped. The person can still change it. */
  unit: Unit;
};

/** Activities offered as tiles. The person picks one, then picks how much, separately. */
export const ACTIVITIES: ActivityOption[] = [
  { label: "Walking", activity: "Walking", unit: "min" },
  { label: "Running", activity: "Running", unit: "min" },
  { label: "Cycling", activity: "Cycling", unit: "min" },
  { label: "Swimming", activity: "Swimming", unit: "min" },
  { label: "Squats", activity: "Squats", unit: "min" },
  { label: "Lunges", activity: "Lunges", unit: "reps" },
  { label: "Push-ups", activity: "Push-ups", unit: "reps" },
  { label: "Pull-ups", activity: "Pull-ups", unit: "reps" },
  { label: "Sit-ups", activity: "Sit-ups", unit: "reps" },
  { label: "Plank", activity: "Plank", unit: "min" },
  { label: "Knee band", activity: "Resistance band (knee)", unit: "reps" },
  { label: "Strength", activity: "Strength training", unit: "min" },
  { label: "Workout", activity: "Workout", unit: "min" },
  { label: "Yoga", activity: "Yoga", unit: "min" },
  { label: "Stretching", activity: "Stretching", unit: "min" },
  { label: "Breathing", activity: "Breathing exercises", unit: "min" },
  { label: "Dance", activity: "Dance", unit: "min" },
  { label: "Stairs", activity: "Stairs", unit: "min" },
];

/** One-tap amounts shown for each unit. Any other number can be typed. */
export const AMOUNT_PRESETS: Record<Unit, number[]> = {
  min: [5, 10, 15, 20, 30, 45, 60],
  reps: [5, 10, 15, 20, 25, 30, 50],
};

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
  occurredOn: z
    .string()
    .refine((v) => parseUKDate(v) !== null, "Enter a real date as DD/MM/YYYY.")
    .transform((v) => parseUKDate(v) as string),
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

export type ActivityKind =
  | "walk"
  | "run"
  | "legs"
  | "band"
  | "mind"
  | "stretch"
  | "cycle"
  | "swim"
  | "lift"
  | "dance"
  | "core"
  | "climb"
  | "other";

/** What sort of activity this is, matched by keyword. The UI maps each kind to an icon. */
export function activityKind(activity: string): ActivityKind {
  const a = activity.toLowerCase();
  if (/walk|steps|hike/.test(a)) return "walk";
  if (/run|jog/.test(a)) return "run";
  if (/squat|lunge|leg/.test(a)) return "legs";
  if (/knee|band/.test(a)) return "band";
  if (/breath|meditat|yoga/.test(a)) return "mind";
  if (/stretch/.test(a)) return "stretch";
  if (/cycl|bike/.test(a)) return "cycle";
  if (/swim/.test(a)) return "swim";
  if (/weight|lift|gym|push|pull|strength/.test(a)) return "lift";
  if (/dance|zumba/.test(a)) return "dance";
  if (/plank|core|abs|sit-?up/.test(a)) return "core";
  if (/stair|climb/.test(a)) return "climb";
  return "other";
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

// ---------------------------------------------------------------------------
// UK dates
// ---------------------------------------------------------------------------

/** "2026-11-18" -> "18/11/2026". */
export function formatUK(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-11-18" -> "18/11". */
export function formatUKShort(date: string): string {
  return formatUK(date).slice(0, 5);
}

/**
 * Parse a typed date into "YYYY-MM-DD", or null if it is not a real date.
 * Accepts DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DDMMYYYY (UK order) and ISO YYYY-MM-DD.
 */
export function parseUKDate(input: string): string | null {
  const text = input.trim();
  let y: number, m: number, d: number;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const uk =
    text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/) ?? text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (uk) {
    [d, m, y] = [Number(uk[1]), Number(uk[2]), Number(uk[3])];
  } else {
    return null;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const RANGES = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "quarter", label: "3 months", days: 90 },
  { key: "year", label: "Year", days: 365 },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export function parseRange(value: string | undefined): RangeKey {
  return RANGES.find((r) => r.key === value)?.key ?? "week";
}

export function rangeDays(key: RangeKey): number {
  return RANGES.find((r) => r.key === key)?.days ?? 7;
}

/** First date of a rolling window of `days` days ending on `today`. */
export function windowStart(today: string, days: number): string {
  return shiftDate(today, -(days - 1));
}

/** Minutes per person over the last `days` days ending on `today`. Reps are not summed. */
export function minutesByUser(
  rows: WorkoutRow[],
  today: string,
  days: number,
): Map<string, number> {
  const from = windowStart(today, days);
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.unit !== "min") continue;
    if (row.occurredOn < from || row.occurredOn > today) continue;
    totals.set(row.userId, (totals.get(row.userId) ?? 0) + row.amount);
  }
  return totals;
}

export type Summary = {
  minutes: number;
  sessions: number;
  activeDays: number;
  avgPerActiveDay: number;
  best: DayTotal | null;
  /** Weekday number (0 = Sunday) with the most minutes, or null if nothing logged. */
  busiestWeekday: number | null;
  previousMinutes: number;
  /** Percent change in minutes versus the previous equal-length window, or null if it had none. */
  deltaPct: number | null;
};

/** Headline numbers for the window of `days` days ending on `today`. */
export function summarize(rows: WorkoutRow[], today: string, days: number): Summary {
  const from = windowStart(today, days);
  const prevFrom = shiftDate(from, -days);
  const prevTo = shiftDate(from, -1);
  const perDay = new Map<string, number>();
  const activeDates = new Set<string>();
  const weekdays = new Array<number>(7).fill(0);
  let sessions = 0;
  let previousMinutes = 0;

  for (const row of rows) {
    const inWindow = row.occurredOn >= from && row.occurredOn <= today;
    if (inWindow) {
      sessions += 1;
      activeDates.add(row.occurredOn);
    }
    if (row.unit !== "min") continue;
    if (inWindow) {
      perDay.set(row.occurredOn, (perDay.get(row.occurredOn) ?? 0) + row.amount);
      const [y, m, d] = row.occurredOn.split("-").map(Number) as [number, number, number];
      const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      weekdays[wd] = (weekdays[wd] ?? 0) + row.amount;
    } else if (row.occurredOn >= prevFrom && row.occurredOn <= prevTo) {
      previousMinutes += row.amount;
    }
  }

  const minutes = [...perDay.values()].reduce((a, b) => a + b, 0);
  let best: DayTotal | null = null;
  for (const [date, mins] of perDay) {
    if (!best || mins > best.minutes) best = { date, minutes: mins };
  }
  const maxWd = Math.max(...weekdays);
  return {
    minutes,
    sessions,
    activeDays: activeDates.size,
    avgPerActiveDay: activeDates.size ? Math.round(minutes / activeDates.size) : 0,
    best,
    busiestWeekday: maxWd > 0 ? weekdays.indexOf(maxWd) : null,
    previousMinutes,
    deltaPct:
      previousMinutes > 0
        ? Math.round(((minutes - previousMinutes) / previousMinutes) * 100)
        : null,
  };
}

export type Slice = { activity: string; minutes: number; pct: number };

/** Minutes by activity in the window, biggest first. Smaller ones are merged into "Other". */
export function activityBreakdown(
  rows: (WorkoutRow & { activity: string })[],
  today: string,
  days: number,
  limit = 5,
): Slice[] {
  const from = windowStart(today, days);
  const groups = new Map<string, { activity: string; minutes: number }>();
  for (const row of rows) {
    if (row.unit !== "min" || row.occurredOn < from || row.occurredOn > today) continue;
    const key = row.activity.trim().toLowerCase();
    const g = groups.get(key) ?? { activity: row.activity.trim(), minutes: 0 };
    g.minutes += row.amount;
    groups.set(key, g);
  }
  const sorted = [...groups.values()].sort((a, b) => b.minutes - a.minutes);
  const total = sorted.reduce((s, g) => s + g.minutes, 0);
  if (total === 0) return [];
  const head = sorted.slice(0, limit);
  const restMinutes = sorted.slice(limit).reduce((s, g) => s + g.minutes, 0);
  if (restMinutes > 0) head.push({ activity: "Other", minutes: restMinutes });
  return head.map((g) => ({ ...g, pct: Math.round((g.minutes / total) * 100) }));
}

export type Bucket = { start: string; end: string; mine: number; theirs: number };
export type Series = { kind: "day" | "week" | "month"; buckets: Bucket[] };

function monthStart(date: string, offset: number): string {
  const [y, m] = date.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 10);
}

/**
 * Minutes over time for the chart, split into "mine" and "theirs".
 * Up to 30 days: one bar per day. 90 days: one bar per week. A year: one bar per calendar month.
 */
export function series(rows: WorkoutRow[], today: string, days: number, viewerId: string): Series {
  let kind: Series["kind"];
  const buckets: Bucket[] = [];
  if (days <= 30) {
    kind = "day";
    for (let i = days - 1; i >= 0; i--) {
      const d = shiftDate(today, -i);
      buckets.push({ start: d, end: d, mine: 0, theirs: 0 });
    }
  } else if (days <= 90) {
    kind = "week";
    const weeks = Math.ceil(days / 7);
    for (let i = weeks - 1; i >= 0; i--) {
      buckets.push({
        start: shiftDate(today, -(i * 7 + 6)),
        end: shiftDate(today, -i * 7),
        mine: 0,
        theirs: 0,
      });
    }
  } else {
    kind = "month";
    for (let i = 11; i >= 0; i--) {
      const start = monthStart(today, -i);
      const nextStart = monthStart(today, -i + 1);
      const end = i === 0 ? today : shiftDate(nextStart, -1);
      buckets.push({ start, end, mine: 0, theirs: 0 });
    }
  }
  for (const row of rows) {
    if (row.unit !== "min") continue;
    const b = buckets.find((x) => row.occurredOn >= x.start && row.occurredOn <= x.end);
    if (!b) continue;
    if (row.userId === viewerId) b.mine += row.amount;
    else b.theirs += row.amount;
  }
  return { kind, buckets };
}

export type HeatCell = { date: string; minutes: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/** Calendar heatmap: `weeks` columns of 7 days (Monday first), the last column holding today. */
export function heatmapWeeks(rows: WorkoutRow[], today: string, weeks = 12): HeatCell[][] {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const mondayOffset = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const firstMonday = shiftDate(today, -mondayOffset - (weeks - 1) * 7);
  const perDay = new Map<string, number>();
  for (const row of rows) {
    if (row.unit === "min") {
      perDay.set(row.occurredOn, (perDay.get(row.occurredOn) ?? 0) + row.amount);
    }
  }
  const max = Math.max(1, ...perDay.values());
  const grid: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = shiftDate(firstMonday, w * 7 + i);
      const minutes = perDay.get(date) ?? 0;
      const raw = minutes === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((minutes / max) * 4)));
      col.push({ date, minutes, level: raw as HeatCell["level"], future: date > today });
    }
    grid.push(col);
  }
  return grid;
}
