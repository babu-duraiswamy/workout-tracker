import { Layers } from "lucide-react";
import { ActivityIcon } from "@/components/activity-icon";
import type { Slice } from "@/lib/workouts";

// Distinct, colour-blind-friendly-ish hues. "Other" is always the neutral last one.
const COLORS = ["#f97316", "#6366f1", "#f43f5e", "#0ea5e9", "#eab308", "#a855f7"];
const OTHER = "#94a3b8";

function colorFor(slice: Slice, i: number): string {
  return slice.activity === "Other" ? OTHER : (COLORS[i % COLORS.length] ?? OTHER);
}

/** Donut of minutes by activity, with a legend. Pure CSS conic-gradient. */
export function ActivityDonut({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.minutes, 0);
  const stops = slices.map((s, i) => {
    const before = slices.slice(0, i).reduce((sum, x) => sum + x.minutes, 0);
    const from = (before / total) * 100;
    const to = ((before + s.minutes) / total) * 100;
    return `${colorFor(s, i)} ${from}% ${to}%`;
  });

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative grid size-32 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        role="img"
        aria-label={`Minutes by activity: ${slices.map((s) => `${s.activity} ${s.pct}%`).join(", ")}`}
      >
        <div className="grid size-20 place-items-center rounded-full bg-white text-center leading-tight shadow-inner dark:bg-slate-900">
          <div>
            <div className="text-xl font-bold tabular-nums">{total}</div>
            <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              min
            </div>
          </div>
        </div>
      </div>
      <ul className="grid min-w-0 flex-1 gap-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.activity} className="flex items-center gap-2">
            <i
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorFor(s, i) }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">
              {s.activity === "Other" ? (
                <Layers aria-hidden="true" className="mr-1.5 inline size-4 align-[-3px]" />
              ) : (
                <ActivityIcon activity={s.activity} className="mr-1.5 inline size-4 align-[-3px]" />
              )}
              {s.activity}
            </span>
            <span className="font-semibold tabular-nums">{s.minutes}</span>
            <span className="w-9 text-right text-xs text-slate-500 tabular-nums">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
