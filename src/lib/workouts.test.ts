import { describe, expect, it } from "vitest";
import {
  ACTIVITIES,
  AMOUNT_PRESETS,
  activityKind,
  activityBreakdown,
  currentStreak,
  formatUK,
  heatmapWeeks,
  parseRange,
  parseUKDate,
  series,
  summarize,
  dailyMinutes,
  goalPercent,
  shiftDate,
  todayIST,
  topActivities,
  weeklyMinutesByUser,
  workoutInputSchema,
  type WorkoutRow,
} from "./workouts";

describe("todayIST", () => {
  it("uses the IST calendar date, not UTC", () => {
    // 19:00 UTC on 18 Nov is 00:30 IST on 19 Nov.
    expect(todayIST(new Date("2026-11-18T19:00:00Z"))).toBe("2026-11-19");
  });
});

describe("shiftDate", () => {
  it("moves across month and year boundaries", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2026-11-18", -6)).toBe("2026-11-12");
  });
});

describe("weeklyMinutesByUser", () => {
  const today = "2026-11-18";
  const rows: WorkoutRow[] = [
    { userId: "a", amount: 15, unit: "min", occurredOn: "2026-11-18" },
    { userId: "a", amount: 10, unit: "min", occurredOn: "2026-11-12" }, // day 7 back: included
    { userId: "a", amount: 99, unit: "min", occurredOn: "2026-11-11" }, // outside window
    { userId: "b", amount: 5, unit: "min", occurredOn: "2026-11-15" },
    { userId: "b", amount: 10, unit: "reps", occurredOn: "2026-11-15" }, // reps are not summed
  ];

  it("sums minutes inside the 7-day window only", () => {
    const totals = weeklyMinutesByUser(rows, today);
    expect(totals.get("a")).toBe(25);
    expect(totals.get("b")).toBe(5);
  });
});

describe("workoutInputSchema", () => {
  const valid = {
    activity: "  Squats ",
    amount: "10",
    unit: "min",
    occurredOn: "2026-11-18",
  };

  it("accepts a valid entry and trims the activity", () => {
    const parsed = workoutInputSchema.parse(valid);
    expect(parsed.activity).toBe("Squats");
    expect(parsed.amount).toBe(10);
  });

  it("rejects zero, decimals and unknown units", () => {
    expect(workoutInputSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
    expect(workoutInputSchema.safeParse({ ...valid, amount: "2.5" }).success).toBe(false);
    expect(workoutInputSchema.safeParse({ ...valid, unit: "km" }).success).toBe(false);
  });

  it("rejects a blank activity", () => {
    expect(workoutInputSchema.safeParse({ ...valid, activity: "   " }).success).toBe(false);
  });
});

describe("dailyMinutes", () => {
  const rows: WorkoutRow[] = [
    { userId: "a", amount: 15, unit: "min", occurredOn: "2026-11-18" },
    { userId: "b", amount: 5, unit: "min", occurredOn: "2026-11-18" },
    { userId: "a", amount: 10, unit: "reps", occurredOn: "2026-11-17" },
    { userId: "a", amount: 20, unit: "min", occurredOn: "2026-11-12" },
    { userId: "a", amount: 99, unit: "min", occurredOn: "2026-11-11" },
  ];

  it("returns 7 days, oldest first, summing minutes only", () => {
    const days = dailyMinutes(rows, "2026-11-18");
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: "2026-11-12", minutes: 20 });
    expect(days[5]).toEqual({ date: "2026-11-17", minutes: 0 });
    expect(days[6]).toEqual({ date: "2026-11-18", minutes: 20 });
  });

  it("can be limited to one user", () => {
    expect(dailyMinutes(rows, "2026-11-18", "b")[6]?.minutes).toBe(5);
  });
});

describe("currentStreak", () => {
  const log = (...dates: string[]): WorkoutRow[] =>
    dates.map((occurredOn) => ({ userId: "a", amount: 5, unit: "min" as const, occurredOn }));

  it("counts consecutive days ending today", () => {
    expect(currentStreak(log("2026-11-18", "2026-11-17", "2026-11-16"), "2026-11-18", "a")).toBe(3);
  });

  it("keeps the streak alive if today is not logged yet", () => {
    expect(currentStreak(log("2026-11-17", "2026-11-16"), "2026-11-18", "a")).toBe(2);
  });

  it("is zero after a missed day, and ignores other users", () => {
    expect(currentStreak(log("2026-11-16"), "2026-11-18", "a")).toBe(0);
    expect(currentStreak(log("2026-11-18"), "2026-11-18", "b")).toBe(0);
  });
});

describe("activityKind", () => {
  it("matches keywords and falls back", () => {
    expect(activityKind("Walking")).toBe("walk");
    expect(activityKind("Resistance band (knee)")).toBe("band");
    expect(activityKind("Basketball")).toBe("other");
  });
});

describe("goalPercent", () => {
  it("rounds and caps at 100", () => {
    expect(goalPercent(75, 150)).toBe(50);
    expect(goalPercent(200, 150)).toBe(100);
    expect(goalPercent(0, 150)).toBe(0);
    expect(goalPercent(10, 0)).toBe(0);
  });
});

describe("topActivities", () => {
  const rows = [
    {
      userId: "a",
      activity: "Walking",
      amount: 15,
      unit: "min" as const,
      occurredOn: "2026-11-18",
    },
    {
      userId: "b",
      activity: "walking",
      amount: 20,
      unit: "min" as const,
      occurredOn: "2026-11-17",
    },
    { userId: "a", activity: "Squats", amount: 10, unit: "min" as const, occurredOn: "2026-11-18" },
    {
      userId: "a",
      activity: "Knee band",
      amount: 10,
      unit: "reps" as const,
      occurredOn: "2026-11-18",
    },
    { userId: "a", activity: "Old", amount: 50, unit: "min" as const, occurredOn: "2026-11-01" },
  ];

  it("groups case-insensitively, ignores old entries and sums minutes only", () => {
    const top = topActivities(rows, "2026-11-18");
    expect(top[0]).toEqual({ activity: "Walking", minutes: 35, count: 2 });
    expect(top.map((t) => t.activity)).not.toContain("Old");
    expect(top.find((t) => t.activity === "Knee band")?.minutes).toBe(0);
  });

  it("respects the limit", () => {
    expect(topActivities(rows, "2026-11-18", 2)).toHaveLength(2);
  });
});

describe("UK dates", () => {
  it("formats ISO as DD/MM/YYYY", () => {
    expect(formatUK("2026-11-18")).toBe("18/11/2026");
  });

  it("parses the common UK spellings and ISO", () => {
    for (const input of ["18/11/2026", "18-11-2026", "18.11.2026", "18112026", "2026-11-18"]) {
      expect(parseUKDate(input)).toBe("2026-11-18");
    }
    expect(parseUKDate("8/1/2026")).toBe("2026-01-08");
  });

  it("rejects impossible or malformed dates", () => {
    for (const input of ["31/02/2026", "13/13/2026", "2026/11/18", "hello", ""]) {
      expect(parseUKDate(input)).toBeNull();
    }
  });

  it("is accepted by the workout schema and normalised to ISO", () => {
    const base = { activity: "Walk", amount: 5, unit: "min" };
    const ok = workoutInputSchema.safeParse({ ...base, occurredOn: "18/11/2026" });
    expect(ok.success && ok.data.occurredOn).toBe("2026-11-18");
    expect(workoutInputSchema.safeParse({ ...base, occurredOn: "32/11/2026" }).success).toBe(false);
  });
});

describe("analytics", () => {
  const today = "2026-11-18"; // a Wednesday
  const mk = (
    userId: string,
    occurredOn: string,
    amount: number,
    unit: "min" | "reps" = "min",
    activity = "Walking",
  ) => ({ userId, occurredOn, amount, unit, activity });
  const rows = [
    mk("a", "2026-11-18", 30),
    mk("a", "2026-11-17", 15, "min", "Squats"),
    mk("b", "2026-11-17", 10),
    mk("a", "2026-11-16", 10, "reps", "Knee band"),
    mk("a", "2026-11-09", 60), // previous 7-day window (11-05 to 11-11)
    mk("a", "2026-11-05", 40), // previous window too
  ];

  it("summarises a window and compares with the previous one", () => {
    const s = summarize(rows, today, 7);
    expect(s.minutes).toBe(55);
    expect(s.sessions).toBe(4);
    expect(s.activeDays).toBe(3);
    expect(s.avgPerActiveDay).toBe(18);
    expect(s.best).toEqual({ date: "2026-11-18", minutes: 30 });
    expect(s.busiestWeekday).toBe(3);
    expect(s.previousMinutes).toBe(100);
    expect(s.deltaPct).toBe(-45);
  });

  it("returns an empty summary for an empty window", () => {
    expect(summarize([], today, 7)).toMatchObject({
      minutes: 0,
      best: null,
      busiestWeekday: null,
      deltaPct: null,
    });
  });

  it("breaks minutes down by activity and merges the tail into Other", () => {
    const slices = activityBreakdown(rows, today, 7, 1);
    expect(slices.map((x) => x.activity)).toEqual(["Walking", "Other"]);
    expect(slices[0]).toMatchObject({ minutes: 40, pct: 73 });
    expect(slices[1]?.minutes).toBe(15);
  });

  it("buckets a series by day, week or month and splits mine/theirs", () => {
    const week = series(rows, today, 7, "a");
    expect(week.kind).toBe("day");
    expect(week.buckets).toHaveLength(7);
    expect(week.buckets[5]).toMatchObject({ mine: 15, theirs: 10 });
    const quarter = series(rows, today, 90, "a");
    expect(quarter.kind).toBe("week");
    expect(quarter.buckets).toHaveLength(13);
    const year = series(rows, today, 365, "a");
    expect(year.kind).toBe("month");
    expect(year.buckets).toHaveLength(12);
    expect(year.buckets[11]).toMatchObject({
      start: "2026-11-01",
      end: today,
      mine: 145,
      theirs: 10,
    });
  });

  it("builds a Monday-first heatmap ending with this week", () => {
    const grid = heatmapWeeks(rows, today, 12);
    expect(grid).toHaveLength(12);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[11]?.[0]?.date).toBe("2026-11-16");
    expect(grid[11]?.[2]).toMatchObject({ date: "2026-11-18", minutes: 30, future: false });
    expect(grid[11]?.[3]?.future).toBe(true);
    expect(grid[11]?.[2]?.level).toBe(2);
  });

  it("falls back to week for unknown ranges", () => {
    expect(parseRange("month")).toBe("month");
    expect(parseRange("nonsense")).toBe("week");
    expect(parseRange(undefined)).toBe("week");
  });
});

describe("activity options", () => {
  it("has unique names that the schema accepts", () => {
    const names = ACTIVITIES.map((a) => a.activity);
    expect(new Set(names).size).toBe(names.length);
    for (const a of ACTIVITIES) {
      const parsed = workoutInputSchema.safeParse({
        activity: a.activity,
        amount: 10,
        unit: a.unit,
        occurredOn: "18/11/2026",
      });
      expect(parsed.success, a.activity).toBe(true);
    }
  });

  it("offers valid amount presets for both units", () => {
    for (const unit of ["min", "reps"] as const) {
      expect(AMOUNT_PRESETS[unit].length).toBeGreaterThan(3);
      expect(AMOUNT_PRESETS[unit].every((n) => Number.isInteger(n) && n >= 1 && n <= 999)).toBe(
        true,
      );
    }
  });
});
