import { formatUK, type Summary } from "@/lib/workouts";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Tile({
  gradient,
  icon,
  label,
  value,
  unit,
  sub,
  delay,
}: {
  gradient: string;
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  sub: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className={`animate-rise relative overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-white shadow-lg ${gradient}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span aria-hidden="true" className="absolute -top-2 -right-1 text-5xl opacity-25">
        {icon}
      </span>
      <div className="relative text-xs font-semibold tracking-wide text-white/85 uppercase">
        {label}
      </div>
      <div className="relative mt-1 text-3xl font-extrabold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-white/80">{unit}</span>}
      </div>
      <div className="relative mt-1 text-xs text-white/90">{sub}</div>
    </div>
  );
}

export function KpiTiles({ summary, days }: { summary: Summary; days: number }) {
  const { deltaPct } = summary;
  const delta =
    deltaPct === null ? (
      "No earlier period to compare"
    ) : deltaPct === 0 ? (
      "Same as the period before"
    ) : (
      <span className="font-bold">
        {deltaPct > 0 ? "▲" : "▼"} {Math.abs(deltaPct)}%
        <span className="font-normal"> vs the period before</span>
      </span>
    );

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        gradient="from-emerald-500 to-teal-600"
        icon="⏱️"
        label="Minutes"
        value={summary.minutes}
        sub={delta}
        delay={0}
      />
      <Tile
        gradient="from-sky-500 to-indigo-600"
        icon="✅"
        label="Sessions"
        value={summary.sessions}
        sub={`${summary.avgPerActiveDay} min on an active day`}
        delay={60}
      />
      <Tile
        gradient="from-amber-500 to-orange-600"
        icon="📅"
        label="Active days"
        value={summary.activeDays}
        unit={`of ${days}`}
        sub={
          summary.busiestWeekday === null
            ? "Nothing logged yet"
            : `Busiest on ${WEEKDAYS[summary.busiestWeekday]}s`
        }
        delay={120}
      />
      <Tile
        gradient="from-fuchsia-500 to-rose-600"
        icon="🏅"
        label="Best day"
        value={summary.best?.minutes ?? 0}
        unit="min"
        sub={summary.best ? formatUK(summary.best.date) : "Log something to set the bar"}
        delay={180}
      />
    </div>
  );
}
