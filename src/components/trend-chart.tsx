import { formatUK, formatUKShort, type Series } from "@/lib/workouts";
import { TONES } from "@/components/avatar";

function weekdayLetter(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "narrow",
    timeZone: "UTC",
  });
}

function monthName(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
}

const TITLES = { day: "Minutes per day", week: "Minutes per week", month: "Minutes per month" };

/** Stacked bar chart (you / them) over the chosen range. Pure CSS, no client JS. */
export function TrendChart({ data }: { data: Series }) {
  const { kind, buckets } = data;
  const totals = buckets.map((b) => b.mine + b.theirs);
  const max = Math.max(1, ...totals);
  const n = buckets.length;
  const dense = n > 14;

  function label(i: number): string {
    const b = buckets[i]!;
    if (kind === "month") return monthName(b.start);
    if (kind === "week") return (n - 1 - i) % 2 === 0 ? formatUKShort(b.start) : "";
    if (n <= 7) return weekdayLetter(b.start);
    return (n - 1 - i) % 6 === 0 ? formatUKShort(b.start) : "";
  }

  const summary = buckets.map((b, i) => `${formatUK(b.start)} ${totals[i]} min`).join(", ");

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{TITLES[kind]}</span>
        <span className="text-xs text-slate-500">peak {max} min</span>
      </div>
      <div className="relative mt-4 h-40" role="img" aria-label={summary}>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 border-t border-dashed border-slate-300/70 dark:border-slate-700"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300/50 dark:border-slate-700/70"
        />
        <div className={`relative flex h-full items-end ${dense ? "gap-0.5" : "gap-2"}`}>
          {buckets.map((b, i) => {
            const total = totals[i] ?? 0;
            const range =
              b.start === b.end ? formatUK(b.start) : `${formatUK(b.start)} – ${formatUK(b.end)}`;
            return (
              <div
                key={b.start}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                <div
                  className="flex w-full flex-1 flex-col justify-end"
                  title={`${range}: ${total} min`}
                >
                  <div
                    className={`animate-grow-up flex w-full flex-col justify-end overflow-hidden ${dense ? "rounded-sm" : "rounded-lg"} ${total === 0 ? "bg-slate-200/70 dark:bg-slate-800" : ""}`}
                    style={{
                      height: `${total === 0 ? 3 : Math.max(5, (total / max) * 100)}%`,
                      animationDelay: `${Math.min(i * 40, 600)}ms`,
                    }}
                  >
                    <div className={TONES.other.bar} style={{ flexGrow: b.theirs }} />
                    <div className={TONES.you.bar} style={{ flexGrow: b.mine }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={`mt-1 flex ${dense ? "gap-0.5" : "gap-2"}`} aria-hidden="true">
        {buckets.map((b, i) => (
          <div key={b.start} className="relative h-4 min-w-0 flex-1">
            <span className="absolute left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-slate-500">
              {label(i)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <i className={`size-2.5 rounded-full ${TONES.you.bar}`} /> You
        </span>
        <span className="flex items-center gap-1.5">
          <i className={`size-2.5 rounded-full ${TONES.other.bar}`} /> Them
        </span>
      </div>
    </div>
  );
}
