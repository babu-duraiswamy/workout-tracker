import { formatUK, type HeatCell } from "@/lib/workouts";

const LEVEL = [
  "bg-slate-200/70 dark:bg-slate-800",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-300 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-500",
  "bg-emerald-700 dark:bg-emerald-300",
] as const;

const DAY_LABELS = ["M", "", "W", "", "F", "", ""];

/** GitHub-style consistency calendar: one column per week, Monday at the top. */
export function Heatmap({ weeks, today }: { weeks: HeatCell[][]; today: string }) {
  const active = weeks.flat().filter((c) => c.minutes > 0).length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">Consistency · last {weeks.length} weeks</span>
        <span className="text-xs text-slate-500">{active} active days</span>
      </div>
      <div
        className="mt-3 flex gap-2"
        role="img"
        aria-label={`${active} active days in the last ${weeks.length} weeks`}
      >
        <div
          className="grid grid-rows-7 gap-1 text-[10px] leading-none text-slate-500"
          aria-hidden="true"
        >
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="grid place-items-center">
              {l}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1">
          {weeks.flat().map((c) => (
            <div
              key={c.date}
              title={`${formatUK(c.date)}: ${c.minutes} min`}
              className={`aspect-square rounded-[4px] ${c.future ? "opacity-0" : LEVEL[c.level]} ${c.date === today ? "ring-2 ring-slate-900/60 dark:ring-white/70" : ""}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-500">
        Less
        {LEVEL.map((cls, i) => (
          <i key={i} className={`size-3 rounded-[3px] ${cls}`} />
        ))}
        More
      </div>
    </div>
  );
}
