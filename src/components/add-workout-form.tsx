"use client";

import { useActionState, useEffect, useRef } from "react";
import { addWorkout, type AddState } from "@/app/actions";
import { activityEmoji, QUICK_PICKS } from "@/lib/workouts";

const initial: AddState = {};

const CHIP_COLORS = [
  "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900",
  "bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900",
  "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900",
  "bg-fuchsia-100 text-fuchsia-900 hover:bg-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-200 dark:hover:bg-fuchsia-900",
  "bg-rose-100 text-rose-900 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900",
  "bg-violet-100 text-violet-900 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900",
];

const FIELD =
  "min-w-0 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-base text-slate-900 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100";

export function AddWorkoutForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(addWorkout, initial);

  // Clear the form after a successful save. The date goes back to today.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  function bump(delta: number) {
    const input = formRef.current?.elements.namedItem("amount") as HTMLInputElement | null;
    if (!input) return;
    const next = Math.min(999, Math.max(1, (Number(input.value) || 0) + delta));
    input.value = String(next);
  }

  function pick(activity: string, amount: number, unit: string) {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("activity") as HTMLInputElement).value = activity;
    (form.elements.namedItem("amount") as HTMLInputElement).value = String(amount);
    (form.elements.namedItem("unit") as HTMLSelectElement).value = unit;
    (form.elements.namedItem("amount") as HTMLInputElement).focus();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg shadow-emerald-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
    >
      <div>
        <h2 className="text-lg font-bold">Log a workout</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Tap a quick pick, then Log it.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick picks">
        {QUICK_PICKS.map((q, i) => (
          <button
            key={q.label}
            type="button"
            onClick={() => pick(q.activity, q.amount, q.unit)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${CHIP_COLORS[i % CHIP_COLORS.length]}`}
          >
            <span aria-hidden="true">{activityEmoji(q.activity)} </span>
            {q.label}
          </button>
        ))}
      </div>

      <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
        Activity
        <input
          name="activity"
          type="text"
          maxLength={80}
          required
          autoComplete="off"
          placeholder="e.g. Walking"
          className={FIELD}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Amount
          <div className="grid grid-cols-[1fr_5.5rem] gap-2">
            <input
              name="amount"
              type="number"
              min={1}
              max={999}
              step={1}
              inputMode="numeric"
              required
              placeholder="15"
              className={FIELD}
            />
            <select name="unit" defaultValue="min" aria-label="Unit" className={FIELD}>
              <option value="min">min</option>
              <option value="reps">reps</option>
            </select>
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Adjust amount">
            {[-5, 5, 10].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => bump(d)}
                className="flex-1 rounded-lg bg-slate-100 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Date
          <input name="occurredOn" type="date" defaultValue={today} required className={FIELD} />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-4 py-3.5 text-base font-bold text-white shadow-md shadow-emerald-600/30 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log it"}
      </button>

      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-medium">
        {state.error ? (
          <span className="text-rose-700 dark:text-rose-400">{state.error}</span>
        ) : state.ok ? (
          <span className="text-emerald-700 dark:text-emerald-400">🎉 Logged. Nice work!</span>
        ) : null}
      </p>
    </form>
  );
}
