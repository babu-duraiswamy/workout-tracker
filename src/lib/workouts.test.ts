import { describe, expect, it } from "vitest";
import {
  shiftDate,
  todayIST,
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
