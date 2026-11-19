import { Trophy } from "lucide-react";
import { goalPercent, WEEKLY_GOAL_MIN } from "@/lib/workouts";

/** Circular progress toward the weekly minutes goal. Pure SVG, no client JS. */
export function GoalRing({ minutes }: { minutes: number }) {
  const pct = goalPercent(minutes);
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  const done = pct >= 100;

  return (
    <div
      className="relative size-24 shrink-0"
      role="img"
      aria-label={`${minutes} of ${WEEKLY_GOAL_MIN} minutes, ${pct} percent of the weekly goal`}
    >
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-draw-ring"
          style={{ ["--ring-full" as string]: circumference }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        {done ? (
          <Trophy aria-hidden="true" className="size-9" strokeWidth={2} />
        ) : (
          <span className="text-xl font-bold tabular-nums">
            {pct}
            <span className="text-xs font-semibold">%</span>
          </span>
        )}
      </div>
    </div>
  );
}
