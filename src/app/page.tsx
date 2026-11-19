import { count, desc, eq, gte } from "drizzle-orm";
import {
  Flame,
  Flag,
  Hand,
  HeartHandshake,
  LogOut,
  Moon,
  Sprout,
  Sun,
  Sunrise,
  Trash2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clearMyWorkouts, deleteSelected } from "@/app/actions";
import { auth, signOut } from "@/auth";
import { ConfirmSubmit, SelectAllButton } from "@/components/bulk-actions";
import { ActivityIcon } from "@/components/activity-icon";
import { ActivityDonut } from "@/components/activity-donut";
import { AddWorkoutForm } from "@/components/add-workout-form";
import { APP_NAME, BrandMark } from "@/components/brand";
import { Avatar, TONES, type Tone } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { GoalRing } from "@/components/goal-ring";
import { Heatmap } from "@/components/heatmap";
import { KpiTiles } from "@/components/kpi-tiles";
import { TrendChart } from "@/components/trend-chart";
import { db, schema } from "@/db";
import {
  activityBreakdown,
  currentStreak,
  formatUK,
  heatmapWeeks,
  minutesByUser,
  parseRange,
  RANGES,
  rangeDays,
  series,
  shiftDate,
  summarize,
  todayIST,
  topActivities,
  WEEKLY_GOAL_MIN,
  windowStart,
  type RangeKey,
} from "@/lib/workouts";

export const dynamic = "force-dynamic";

// Two years of history, so the "Year" view can compare with the year before.
const HISTORY_DAYS = 730;
const ROW_LIMIT = 5000;

const CARD =
  "rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg shadow-orange-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60";

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "me", label: "Just me" },
  { key: "them", label: "Them" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

function displayName(name: string | null, email: string): string {
  return name?.trim() || email.split("@")[0] || "Someone";
}

/** Link that keeps the other query parameter, leaving defaults out of the URL. */
function href(range: RangeKey, who: Filter): string {
  const q = new URLSearchParams();
  if (range !== "week") q.set("range", range);
  if (who !== "all") q.set("who", who);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; range?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const viewerId = session.user.id;

  const params = await searchParams;
  const filter: Filter = params.who === "me" || params.who === "them" ? params.who : "all";
  const range = parseRange(params.range);
  const days = rangeDays(range);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "Week";

  const today = todayIST();
  const rows = await db
    .select({
      id: schema.workouts.id,
      userId: schema.workouts.userId,
      activity: schema.workouts.activity,
      amount: schema.workouts.amount,
      unit: schema.workouts.unit,
      occurredOn: schema.workouts.occurredOn,
      userName: schema.users.name,
      userEmail: schema.users.email,
    })
    .from(schema.workouts)
    .innerJoin(schema.users, eq(schema.users.id, schema.workouts.userId))
    .where(gte(schema.workouts.occurredOn, shiftDate(today, -(HISTORY_DAYS - 1))))
    .orderBy(desc(schema.workouts.occurredOn), desc(schema.workouts.createdAt))
    .limit(ROW_LIMIT);

  // Every entry the viewer has ever logged (not just the loaded window), for "Clear all mine".
  const [{ total: myTotal = 0 } = {}] = await db
    .select({ total: count() })
    .from(schema.workouts)
    .where(eq(schema.workouts.userId, viewerId));

  const names = new Map<string, string>();
  for (const r of rows) names.set(r.userId, displayName(r.userName, r.userEmail));
  const myName =
    names.get(viewerId) ?? displayName(session.user.name ?? null, session.user.email ?? "");
  const nameOf = (id: string) => (id === viewerId ? "You" : (names.get(id) ?? "Someone"));
  const toneOf = (id: string): Tone => (id === viewerId ? "you" : "other");

  // Always-on numbers: weekly goal, streak, and the header pills.
  const weekly = minutesByUser(rows, today, 7);
  const weekTotal = [...weekly.values()].reduce((a, b) => a + b, 0);
  const streak = currentStreak(rows, today, viewerId);
  const people = [viewerId, ...[...names.keys()].filter((id) => id !== viewerId)];

  // Numbers for the selected range.
  const summary = summarize(rows, today, days);
  const trend = series(rows, today, days, viewerId);
  const slices = activityBreakdown(rows, today, days);
  const rangeByUser = minutesByUser(rows, today, days);
  const top = topActivities(rows, today);
  const weeks = heatmapWeeks(rows, today, 12);
  const myRange = rangeByUser.get(viewerId) ?? 0;
  const theirRange = [...rangeByUser.entries()]
    .filter(([id]) => id !== viewerId)
    .reduce((s, [, m]) => s + m, 0);
  const rangeTotal = myRange + theirRange;

  // What the other person did today, for the nudge banner.
  const theirToday = rows.filter((r) => r.occurredOn === today && r.userId !== viewerId);
  const myToday = rows.filter((r) => r.occurredOn === today && r.userId === viewerId);
  const theirName = theirToday[0] ? nameOf(theirToday[0].userId) : null;
  const theirMinutes = theirToday.reduce((s, r) => s + (r.unit === "min" ? r.amount : 0), 0);

  // The log: only the chosen range and person, grouped by month (for long ranges) then day.
  const from = windowStart(today, days);
  const shown = rows.filter(
    (r) =>
      r.occurredOn >= from &&
      (filter === "me" ? r.userId === viewerId : filter === "them" ? r.userId !== viewerId : true),
  );
  type Row = (typeof rows)[number];
  const months = new Map<string, { days: Map<string, Row[]>; minutes: number; sessions: number }>();
  for (const r of shown) {
    const key = r.occurredOn.slice(0, 7);
    const month = months.get(key) ?? { days: new Map(), minutes: 0, sessions: 0 };
    const list = month.days.get(r.occurredOn) ?? [];
    list.push(r);
    month.days.set(r.occurredOn, list);
    month.sessions += 1;
    if (r.unit === "min") month.minutes += r.amount;
    months.set(key, month);
  }
  const showMonths = days > 7;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-4 pb-12 lg:px-8 lg:pt-8">
      <header className="animate-rise relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 via-rose-500 to-indigo-600 p-5 text-white shadow-xl shadow-orange-600/25">
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-8 size-40 rounded-full bg-white/15"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-12 left-1/3 size-32 rounded-full bg-white/10"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <BrandMark className="size-8 rounded-xl bg-white/20 from-white/25 via-white/25 to-white/25 shadow-none" />
              <span className="text-lg font-black tracking-tight">{APP_NAME}</span>
            </div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-white/85">
              <GreetingIcon />
              {greeting()}
            </p>
            <h1 className="truncate text-3xl font-bold tracking-tight">{myName.split(" ")[0]}</h1>
            <p className="mt-0.5 text-xs text-white/80">{formatUK(today)}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/30"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </form>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-sm font-bold">
          <span
            className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-orange-600 shadow-sm"
            title="Days in a row you've logged something"
          >
            <Flame aria-hidden="true" className="size-4 fill-orange-500" />
            {streak} {streak === 1 ? "day" : "days"} streak
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 backdrop-blur">
            <Zap aria-hidden="true" className="size-4 fill-white" />
            {weekTotal} min this week
          </span>
        </div>
      </header>

      {theirName && (
        <p
          className="animate-rise flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100"
          style={{ animationDelay: "60ms" }}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200">
            {myToday.length === 0 ? (
              <Hand aria-hidden="true" className="size-5" />
            ) : (
              <HeartHandshake aria-hidden="true" className="size-5" />
            )}
          </span>
          <span>
            <strong>{theirName}</strong> has logged {theirToday.length}{" "}
            {theirToday.length === 1 ? "entry" : "entries"}
            {theirMinutes > 0 ? ` (${theirMinutes} min)` : ""} today.{" "}
            {myToday.length === 0 ? "Your turn!" : "You're both on it."}
          </span>
        </p>
      )}

      {/* One column on phones. From lg: logging and goals on the left, analytics and the log on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <div className="animate-rise" style={{ animationDelay: "100ms" }}>
            <AddWorkoutForm today={today} />
          </div>

          <section aria-labelledby="goal-h" className="grid gap-3">
            <h2 id="goal-h" className="text-sm font-bold tracking-wide text-slate-500 uppercase">
              Weekly goal · {WEEKLY_GOAL_MIN} min each
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {people.map((userId, i) => {
                const mins = weekly.get(userId) ?? 0;
                const left = Math.max(0, WEEKLY_GOAL_MIN - mins);
                return (
                  <div
                    key={userId}
                    className={`animate-rise flex items-center gap-4 rounded-3xl bg-gradient-to-br p-4 text-white shadow-lg ${TONES[toneOf(userId)].card}`}
                    style={{ animationDelay: `${140 + i * 60}ms` }}
                  >
                    <GoalRing minutes={mins} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Avatar name={nameOf(userId)} tone={toneOf(userId)} size="sm" />
                        <span className="truncate text-sm font-semibold">{nameOf(userId)}</span>
                      </div>
                      <div className="mt-1 text-3xl font-bold tabular-nums">
                        {mins} <span className="text-sm font-medium text-white/80">min</span>
                      </div>
                      <div className="text-xs text-white/85">
                        {left === 0 ? "Goal reached!" : `${left} min to go`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid gap-6">
          <section aria-labelledby="insights-h" className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="insights-h"
                className="text-sm font-bold tracking-wide text-slate-500 uppercase"
              >
                Insights
              </h2>
              <nav
                aria-label="Time range"
                className="flex rounded-full bg-white/70 p-1 text-sm shadow-sm dark:bg-slate-900/70"
              >
                {RANGES.map((r) => (
                  <Link
                    key={r.key}
                    href={href(r.key, filter)}
                    aria-current={range === r.key ? "page" : undefined}
                    className={`rounded-full px-2.5 py-1 font-medium whitespace-nowrap transition sm:px-3 ${
                      range === r.key
                        ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                  >
                    {r.label}
                  </Link>
                ))}
              </nav>
            </div>

            <p className="px-1 text-xs text-slate-500">
              {formatUK(from)} – {formatUK(today)}
            </p>

            <KpiTiles summary={summary} days={days} />

            <div className={CARD}>
              {summary.minutes === 0 ? (
                <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">
                  <Sprout aria-hidden="true" className="mx-auto mb-2 size-9 text-orange-500" />
                  No minutes logged in this period yet.
                </p>
              ) : (
                <TrendChart data={trend} />
              )}
            </div>

            {rangeTotal > 0 && (
              <div className={CARD}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Head to head</span>
                  <span className="text-xs text-slate-500">{rangeTotal} min together</span>
                </div>
                <div
                  className="mt-3 flex h-7 overflow-hidden rounded-full bg-slate-200/70 text-xs font-bold text-white dark:bg-slate-800"
                  role="img"
                  aria-label={`You ${myRange} minutes, them ${theirRange} minutes`}
                >
                  {myRange > 0 && (
                    <div
                      className={`grid place-items-center ${TONES.you.bar}`}
                      style={{ width: `${(myRange / rangeTotal) * 100}%` }}
                    >
                      {myRange}
                    </div>
                  )}
                  {theirRange > 0 && (
                    <div
                      className={`grid place-items-center ${TONES.other.bar}`}
                      style={{ width: `${(theirRange / rangeTotal) * 100}%` }}
                    >
                      {theirRange}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className={TONES.you.text}>
                    You · {Math.round((myRange / rangeTotal) * 100)}%
                  </span>
                  <span className={TONES.other.text}>
                    Them · {Math.round((theirRange / rangeTotal) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {slices.length > 0 && (
              <div className={CARD}>
                <div className="mb-3 text-sm font-semibold">Where the minutes went</div>
                <ActivityDonut slices={slices} />
              </div>
            )}

            <div className={CARD}>
              <Heatmap weeks={weeks} today={today} />
            </div>

            {top.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Most done this week:
                </span>
                {top.map((t) => (
                  <span
                    key={t.activity}
                    className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium shadow-sm dark:bg-slate-900/70"
                  >
                    <ActivityIcon
                      activity={t.activity}
                      className="mr-1 inline size-4 align-[-3px] text-orange-600"
                    />
                    {t.activity} <span className="text-slate-500">×{t.count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="log-h">
            <form className="group/log grid gap-4">
              {/* CSS-only select mode: ticking this reveals the checkboxes and the bulk bar below. */}
              <input
                id="select-mode"
                type="checkbox"
                className="sr-only"
                aria-label="Select entries to remove"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="log-h" className="text-sm font-bold tracking-wide text-slate-500 uppercase">
                  Log · {rangeLabel}
                </h2>
                <nav
                  aria-label="Filter log"
                  className="flex rounded-full bg-white/70 p-1 text-sm shadow-sm dark:bg-slate-900/70"
                >
                  {FILTERS.map((f) => (
                    <Link
                      key={f.key}
                      href={href(range, f.key)}
                      aria-current={filter === f.key ? "page" : undefined}
                      className={`rounded-full px-3 py-1 font-medium transition ${
                        filter === f.key
                          ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                    >
                      {f.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {myTotal > 0 && (
                <>
                  <label
                    htmlFor="select-mode"
                    className="flex w-fit items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition group-has-[#select-mode:checked]/log:bg-rose-600 group-has-[#select-mode:checked]/log:text-white group-has-[#select-mode:focus-visible]/log:outline-2 group-has-[#select-mode:focus-visible]/log:outline-offset-2 group-has-[#select-mode:focus-visible]/log:outline-rose-500 hover:bg-white dark:bg-slate-900/70 dark:text-slate-200"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="group-has-[#select-mode:checked]/log:hidden">
                      Select entries to remove
                    </span>
                    <span className="hidden group-has-[#select-mode:checked]/log:inline">
                      Done selecting
                    </span>
                  </label>
                  <div className="hidden flex-wrap items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm group-has-[#select-mode:checked]/log:flex dark:border-rose-900 dark:bg-rose-950/50">
                    <span className="w-full text-xs text-rose-900 dark:text-rose-200">
                      Tick your entries below. You can only remove your own.
                    </span>
                    <SelectAllButton className="rounded-full bg-white px-3.5 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100" />
                    <ConfirmSubmit
                      action={deleteSelected}
                      needsSelection
                      message="Remove the {n} ticked entries? This can't be undone."
                      className="rounded-full bg-rose-600 px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:bg-rose-700"
                    >
                      Remove selected
                    </ConfirmSubmit>
                    <ConfirmSubmit
                      action={clearMyWorkouts}
                      message={`Clear ALL ${myTotal} of your entries, including older ones not shown here? The other person's entries stay. This can't be undone.`}
                      className="ml-auto rounded-full border border-rose-300 px-3.5 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900"
                    >
                      Clear all mine ({myTotal})
                    </ConfirmSubmit>
                  </div>
                </>
              )}

              {shown.length === 0 ? (
                <p
                  className={`${CARD} border-dashed text-center text-sm text-slate-600 dark:text-slate-400`}
                >
                  <Flag aria-hidden="true" className="mx-auto mb-2 size-9 text-indigo-500" />
                  {rows.length === 0
                    ? "No workouts logged yet. Pick an activity and an amount above, then tap Log."
                    : "Nothing here for this period and filter."}
                </p>
              ) : (
                [...months.entries()].map(([monthKey, month]) => (
                  <div key={monthKey} className="grid gap-4">
                    {showMonths && (
                      <div className="flex items-baseline justify-between rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-2.5 text-white dark:from-slate-800 dark:to-slate-700">
                        <span className="font-bold">{monthLabel(monthKey)}</span>
                        <span className="text-xs text-white/80 tabular-nums">
                          {month.minutes} min · {month.sessions}{" "}
                          {month.sessions === 1 ? "session" : "sessions"}
                        </span>
                      </div>
                    )}
                    {[...month.days.entries()].map(([date, items]) => {
                      const dayMins = items.reduce(
                        (sum, r) => sum + (r.unit === "min" ? r.amount : 0),
                        0,
                      );
                      return (
                        <div key={date} className="grid gap-2">
                          <h3 className="flex items-baseline justify-between px-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {dayLabel(date, today)}
                            {dayMins > 0 && (
                              <span className="text-xs font-normal text-slate-500 tabular-nums">
                                {dayMins} min
                              </span>
                            )}
                          </h3>
                          <ul className="grid gap-2">
                            {items.map((r) => {
                              const tone = toneOf(r.userId);
                              return (
                                <li
                                  key={r.id}
                                  className={`animate-rise flex items-center gap-3 rounded-2xl border border-l-4 border-white/60 bg-white/80 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70 ${tone === "you" ? "border-l-orange-500" : "border-l-indigo-500"}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${TONES[tone].chip}`}
                                  >
                                    <ActivityIcon activity={r.activity} className="size-6" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-semibold">{r.activity}</div>
                                    <div className="mt-0.5 flex items-center gap-1.5 text-sm">
                                      <Avatar name={nameOf(r.userId)} tone={tone} size="sm" />
                                      <span className={`font-medium ${TONES[tone].text}`}>
                                        {nameOf(r.userId)}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className={`rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap tabular-nums ${TONES[tone].chip}`}
                                  >
                                    {r.amount} {r.unit === "reps" ? "reps" : "min"}
                                  </span>
                                  {r.userId === viewerId && (
                                    <>
                                      <input
                                        type="checkbox"
                                        name="ids"
                                        value={r.id}
                                        aria-label={`Select ${r.activity}`}
                                        className="hidden size-5 shrink-0 accent-rose-600 group-has-[#select-mode:checked]/log:block"
                                      />
                                      <DeleteButton
                                        id={r.id}
                                        activity={r.activity}
                                        className="group-has-[#select-mode:checked]/log:hidden"
                                      />
                                    </>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

/** Time-of-day greeting, in IST. */
function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function GreetingIcon({ now = new Date() }: { now?: Date }) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  const Icon = hour < 12 ? Sunrise : hour < 17 ? Sun : Moon;
  return <Icon aria-hidden="true" className="size-4" />;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Today", "Yesterday", otherwise "Mon 17/11/2026". */
function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
  return `${weekday} ${formatUK(date)}`;
}
