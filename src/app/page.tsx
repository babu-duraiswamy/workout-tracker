import { desc, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { deleteWorkout } from "@/app/actions";
import { AddWorkoutForm } from "@/components/add-workout-form";
import { db, schema } from "@/db";
import { shiftDate, todayIST, weeklyMinutesByUser } from "@/lib/workouts";

export const dynamic = "force-dynamic";

const LOG_DAYS = 60;
const LOG_LIMIT = 500;

function displayName(name: string | null, email: string): string {
  return name?.trim() || email.split("@")[0] || "Someone";
}

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const viewerId = session.user.id;

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

  const weekly = weeklyMinutesByUser(rows, today);

  // Group the log by day, newest first.
  const days = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = days.get(r.occurredOn) ?? [];
    list.push(r);
    days.set(r.occurredOn, list);
  }

  return (
    <main className="mx-auto grid max-w-xl gap-8 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workout Tracker</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-neutral-400">
            Log what you did. Entries are shared between you.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm text-stone-500 underline dark:text-neutral-400">
            Sign out
          </button>
        </form>
      </header>

      <AddWorkoutForm today={today} />

      <section aria-labelledby="week-h" className="grid gap-3">
        <h2 id="week-h" className="text-sm font-medium tracking-wide text-stone-500 uppercase">
          Last 7 days · minutes
        </h2>
        {weekly.size === 0 ? (
          <p className="text-sm text-stone-600 dark:text-neutral-400">
            Nothing logged in minutes this week yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[...weekly.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([userId, mins]) => (
                <div
                  key={userId}
                  className="border-t-2 border-emerald-700 pt-2 dark:border-emerald-400"
                >
                  <div className="truncate text-sm text-stone-600 dark:text-neutral-400">
                    {userId === viewerId ? "You" : (names.get(userId) ?? "Someone")}
                  </div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {mins} <span className="text-sm font-normal text-stone-500">min</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section aria-labelledby="log-h" className="grid gap-3">
        <h2 id="log-h" className="text-sm font-medium tracking-wide text-stone-500 uppercase">
          Log
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600 dark:border-neutral-700 dark:text-neutral-400">
            No workouts logged yet. Pick a quick option above, or type one, then tap Log it.
          </p>
        ) : (
          [...days.entries()].map(([date, items]) => (
            <div key={date} className="grid gap-1">
              <h3 className="text-sm font-medium text-stone-500">{dayLabel(date, today)}</h3>
              <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                {items.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.activity}</div>
                      <div className="text-sm text-stone-500">
                        {r.userId === viewerId ? "You" : (names.get(r.userId) ?? "Someone")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold whitespace-nowrap tabular-nums">
                        {r.amount} {r.unit === "reps" ? "reps" : "min"}
                      </span>
                      {r.userId === viewerId && <DeleteButton id={r.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

function DeleteButton({ id }: { id: string }) {
  return (
    <form action={deleteWorkout.bind(null, id)}>
      <button
        type="submit"
        className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        Remove
      </button>
    </form>
  );
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
