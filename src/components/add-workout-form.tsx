"use client";

import { useActionState, useEffect, useRef } from "react";
import { addWorkout, type AddState } from "@/app/actions";
import { QUICK_PICKS } from "@/lib/workouts";

const initial: AddState = {};

export function AddWorkoutForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(addWorkout, initial);

  // Clear the form after a successful save. The date goes back to today.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

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
      className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick picks">
        {QUICK_PICKS.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => pick(q.activity, q.amount, q.unit)}
            className="rounded-full bg-stone-100 px-3 py-1.5 text-sm hover:bg-stone-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            {q.label}
          </button>
        ))}
      </div>

      <label className="grid gap-1 text-sm text-stone-600 dark:text-neutral-400">
        Activity
        <input
          name="activity"
          type="text"
          maxLength={80}
          required
          autoComplete="off"
          placeholder="e.g. Walking"
          className="rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-base text-stone-900 dark:border-neutral-700 dark:text-neutral-100"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm text-stone-600 dark:text-neutral-400">
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
              className="min-w-0 rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-base text-stone-900 dark:border-neutral-700 dark:text-neutral-100"
            />
            <select
              name="unit"
              defaultValue="min"
              aria-label="Unit"
              className="rounded-lg border border-stone-300 bg-transparent px-2 py-2 text-base text-stone-900 dark:border-neutral-700 dark:text-neutral-100"
            >
              <option value="min">min</option>
              <option value="reps">reps</option>
            </select>
          </div>
        </label>

        <label className="grid gap-1 text-sm text-stone-600 dark:text-neutral-400">
          Date
          <input
            name="occurredOn"
            type="date"
            defaultValue={today}
            required
            className="min-w-0 rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-base text-stone-900 dark:border-neutral-700 dark:text-neutral-100"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Log it"}
      </button>

      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {state.error ? (
          <span className="text-red-700 dark:text-red-400">{state.error}</span>
        ) : state.ok ? (
          <span className="text-emerald-700 dark:text-emerald-400">Logged.</span>
        ) : null}
      </p>
    </form>
  );
}
