import { describe, expect, it } from "vitest";
import {
  activityEmoji,
  currentStreak,
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

describe("activityEmoji", () => {
  it("matches keywords and falls back", () => {
    expect(activityEmoji("Walking")).toBe("🚶");
    expect(activityEmoji("Resistance band (knee)")).toBe("🎗️");
    expect(activityEmoji("Basketball")).toBe("💪");
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
