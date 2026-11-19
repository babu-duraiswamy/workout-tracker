import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CircleCheck,
  Medal,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { formatUK, type Summary } from "@/lib/workouts";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Tile({
  gradient,
  icon: Icon,
  label,
  value,
  unit,
  sub,
  delay,
}: {
  gradient: string;
  icon: LucideIcon;
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
      <Icon
        aria-hidden="true"
        strokeWidth={1.75}
        className="absolute -top-1 -right-1 size-16 opacity-25"
      />
      <div className="relative text-xs font-semibold tracking-wide text-white/85 uppercase">
        {label}
      </div>
      <div className="relative mt-1 text-3xl font-bold tabular-nums">
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
        {deltaPct > 0 ? (
          <ArrowUp
            aria-label="Up"
            className="mr-0.5 inline size-3.5 align-[-2px]"
            strokeWidth={3}
          />
        ) : (
          <ArrowDown
            aria-label="Down"
            className="mr-0.5 inline size-3.5 align-[-2px]"
            strokeWidth={3}
          />
        )}
        {Math.abs(deltaPct)}%<span className="font-normal"> vs the period before</span>
      </span>
    );

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        gradient="from-orange-500 to-rose-600"
        icon={Timer}
        label="Minutes"
        value={summary.minutes}
        sub={delta}
        delay={0}
      />
      <Tile
        gradient="from-indigo-500 to-blue-600"
        icon={CircleCheck}
        label="Sessions"
        value={summary.sessions}
        sub={`${summary.avgPerActiveDay} min on an active day`}
        delay={60}
      />
      <Tile
        gradient="from-teal-500 to-cyan-600"
        icon={CalendarDays}
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
        gradient="from-violet-500 to-purple-700"
        icon={Medal}
        label="Best day"
        value={summary.best?.minutes ?? 0}
        unit="min"
        sub={summary.best ? formatUK(summary.best.date) : "Log something to set the bar"}
        delay={180}
      />
    </div>
  );
}
