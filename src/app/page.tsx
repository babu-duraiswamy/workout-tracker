import { desc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AddWorkoutForm } from "@/components/add-workout-form";
import { Avatar, TONES, type Tone } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { GoalRing } from "@/components/goal-ring";
import { db, schema } from "@/db";
import {
  activityEmoji,
  currentStreak,
  dailyMinutes,
  shiftDate,
  todayIST,
  topActivities,
  WEEKLY_GOAL_MIN,
  weeklyMinutesByUser,
} from "@/lib/workouts";

export const dynamic = "force-dynamic";

const LOG_DAYS = 60;
const LOG_LIMIT = 500;

const CARD =
  "rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg shadow-emerald-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60";

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "me", label: "Just me" },
  { key: "them", label: "Them" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

function displayName(name: string | null, email: string): string {
  return name?.trim() || email.split("@")[0] || "Someone";
}

export default async function Home({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const viewerId = session.user.id;

  const { who } = await searchParams;
  const filter: Filter = who === "me" || who === "them" ? who : "all";

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
    .where(gte(schema.workouts.occurredOn, shiftDate(today, -(LOG_DAYS - 1))))
    .orderBy(desc(schema.workouts.occurredOn), desc(schema.workouts.createdAt))
    .limit(LOG_LIMIT);

  const names = new Map<string, string>();
  for (const r of rows) names.set(r.userId, displayName(r.userName, r.userEmail));
  const myName =
    names.get(viewerId) ?? displayName(session.user.name ?? null, session.user.email ?? "");
  const nameOf = (id: string) => (id === viewerId ? "You" : (names.get(id) ?? "Someone"));
  const toneOf = (id: string): Tone => (id === viewerId ? "you" : "other");

  const weekly = weeklyMinutesByUser(rows, today);
  const streak = currentStreak(rows, today, viewerId);
  const allDays = dailyMinutes(rows, today);
  const myDays = dailyMinutes(rows, today, viewerId);
  const chartMax = Math.max(1, ...allDays.map((d) => d.minutes));
  const weekTotal = allDays.reduce((sum, d) => sum + d.minutes, 0);
  const top = topActivities(rows, today);

  // Goal cards: you first, then anyone else who has logged.
  const people = [viewerId, ...[...names.keys()].filter((id) => id !== viewerId)];

  // What the other person did today, for the nudge banner.
  const theirToday = rows.filter((r) => r.occurredOn === today && r.userId !== viewerId);
  const myToday = rows.filter((r) => r.occurredOn === today && r.userId === viewerId);
  const theirName = theirToday[0] ? nameOf(theirToday[0].userId) : null;
  const theirMinutes = theirToday.reduce((s, r) => s + (r.unit === "min" ? r.amount : 0), 0);

  // Group the (filtered) log by day, newest first.
  const shown = rows.filter((r) =>
    filter === "me" ? r.userId === viewerId : filter === "them" ? r.userId !== viewerId : true,
  );
  const days = new Map<string, typeof rows>();
  for (const r of shown) {
    const list = days.get(r.occurredOn) ?? [];
    list.push(r);
    days.set(r.occurredOn, list);
  }

  return (
    <main className="mx-auto grid max-w-xl gap-6 px-4 pt-4 pb-12">
      <header className="animate-rise relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-500 to-fuchsia-500 p-5 text-white shadow-xl shadow-emerald-600/25">
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
            <p className="text-sm font-medium text-white/85">{greeting()}</p>
            <h1 className="truncate text-3xl font-extrabold tracking-tight">
              {myName.split(" ")[0]}
            </h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/30"
            >
              Sign out
            </button>
          </form>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-sm font-bold">
          <span
            className="rounded-full bg-white/95 px-3.5 py-1.5 text-orange-600 shadow-sm"
            title="Days in a row you've logged something"
          >
            🔥 {streak} {streak === 1 ? "day" : "days"} streak
          </span>
          <span className="rounded-full bg-white/20 px-3.5 py-1.5 backdrop-blur">
            ⚡ {weekTotal} min this week
          </span>
        </div>
      </header>

      {theirName && (
        <p
          className="animate-rise flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-100"
          style={{ animationDelay: "60ms" }}
        >
          <span className="text-2xl" aria-hidden="true">
            {myToday.length === 0 ? "👋" : "🙌"}
          </span>
          <span>
            <strong>{theirName}</strong> has logged {theirToday.length}{" "}
            {theirToday.length === 1 ? "entry" : "entries"}
            {theirMinutes > 0 ? ` (${theirMinutes} min)` : ""} today.{" "}
            {myToday.length === 0 ? "Your turn!" : "You're both on it."}
          </span>
        </p>
      )}

      <div className="animate-rise" style={{ animationDelay: "100ms" }}>
        <AddWorkoutForm today={today} />
      </div>

      <section aria-labelledby="week-h" className="grid gap-3">
        <h2 id="week-h" className="text-sm font-bold tracking-wide text-slate-500 uppercase">
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
                  <div className="mt-1 text-3xl font-extrabold tabular-nums">
                    {mins} <span className="text-sm font-medium text-white/80">min</span>
                  </div>
                  <div className="text-xs text-white/85">
                    {left === 0 ? "Goal reached! 🎉" : `${left} min to go`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {weekTotal > 0 && (
          <div className={CARD}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Last 7 days</span>
              <span className="text-sm text-slate-600 tabular-nums dark:text-slate-400">
                {weekTotal} min together
              </span>
            </div>
            <div
              className="mt-4 flex h-28 items-end gap-2"
              role="img"
              aria-label={chartLabel(allDays)}
            >
              {allDays.map((d, i) => {
                const mine = myDays[i]?.minutes ?? 0;
                const theirs = d.minutes - mine;
                const isToday = d.date === today;
                return (
                  <div
                    key={d.date}
                    className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex w-full flex-1 flex-col justify-end">
                      <div
                        className="animate-grow-up flex w-full flex-col justify-end overflow-hidden rounded-md bg-slate-200/60 dark:bg-slate-800/60"
                        style={{
                          height: `${Math.max(6, (d.minutes / chartMax) * 100)}%`,
                          animationDelay: `${i * 70}ms`,
                        }}
                      >
                        <div className={TONES.other.bar} style={{ flexGrow: theirs }} />
                        <div className={TONES.you.bar} style={{ flexGrow: mine }} />
                      </div>
                    </div>
                    <span
                      className={`text-xs ${isToday ? "font-bold text-slate-900 dark:text-slate-100" : "text-slate-500"}`}
                    >
                      {weekdayLetter(d.date)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <i className={`size-2.5 rounded-full ${TONES.you.bar}`} /> You
              </span>
              <span className="flex items-center gap-1.5">
                <i className={`size-2.5 rounded-full ${TONES.other.bar}`} /> Them
              </span>
            </div>
          </div>
        )}

        {top.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Most done:
            </span>
            {top.map((t) => (
              <span
                key={t.activity}
                className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium shadow-sm dark:bg-slate-900/70"
              >
                {activityEmoji(t.activity)} {t.activity}{" "}
                <span className="text-slate-500">×{t.count}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="log-h" className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="log-h" className="text-sm font-bold tracking-wide text-slate-500 uppercase">
            Log
          </h2>
          <nav
            aria-label="Filter log"
            className="flex rounded-full bg-white/70 p-1 text-sm shadow-sm dark:bg-slate-900/70"
          >
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === "all" ? "/" : `/?who=${f.key}`}
                aria-current={filter === f.key ? "page" : undefined}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  filter === f.key
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>

        {shown.length === 0 ? (
          <p
            className={`${CARD} border-dashed text-center text-sm text-slate-600 dark:text-slate-400`}
          >
            <span className="mb-2 block text-3xl">🏁</span>
            {rows.length === 0
              ? "No workouts logged yet. Pick a quick option above, then tap Log it."
              : "Nothing here for this filter."}
          </p>
        ) : (
          [...days.entries()].map(([date, items]) => {
            const dayMins = items.reduce((sum, r) => sum + (r.unit === "min" ? r.amount : 0), 0);
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
                        className={`animate-rise flex items-center gap-3 rounded-2xl border border-l-4 border-white/60 bg-white/80 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70 ${tone === "you" ? "border-l-emerald-500" : "border-l-violet-500"}`}
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 text-2xl dark:from-slate-800 dark:to-slate-700"
                        >
                          {activityEmoji(r.activity)}
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
                        {r.userId === viewerId && <DeleteButton id={r.id} activity={r.activity} />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </section>
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
  if (hour < 12) return "Good morning ☀️";
  if (hour < 17) return "Good afternoon 🌤️";
  return "Good evening 🌙";
}

function weekdayLetter(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "narrow",
    timeZone: "UTC",
  });
}

function chartLabel(days: { date: string; minutes: number }[]): string {
  return `Minutes per day: ${days.map((d) => `${d.date} ${d.minutes}`).join(", ")}`;
}

function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
