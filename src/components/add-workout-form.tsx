"use client";

import { useActionState, useState } from "react";
import { addWorkout, type AddState } from "@/app/actions";
import {
  ACTIVITIES,
  AMOUNT_PRESETS,
  activityEmoji,
  formatUK,
  parseUKDate,
  shiftDate,
  type Unit,
} from "@/lib/workouts";

const initial: AddState = {};

/** Typing "18112026" becomes "18/11/2026". */
function autoSlash(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

const FIELD =
  "min-w-0 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-base text-slate-900 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100";

const CHIP =
  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
const CHIP_OFF =
  "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const CHIP_ON =
  "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-600/25";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
        <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-xs text-white">
          {n}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function AddWorkoutForm({ today }: { today: string }) {
  const [activity, setActivity] = useState("");
  const [unit, setUnit] = useState<Unit>("min");
  const [amount, setAmount] = useState("");
  const [dateText, setDateText] = useState(formatUK(today));

  async function submit(prev: AddState, formData: FormData): Promise<AddState> {
    const result = await addWorkout(prev, formData);
    if (result.ok) {
      setActivity("");
      setAmount("");
      setDateText(formatUK(today));
    }
    return result;
  }
  const [state, formAction, pending] = useActionState(submit, initial);

  const amountNum = Number(amount);
  const date = parseUKDate(dateText);
  const ready =
    activity.trim().length > 0 && Number.isInteger(amountNum) && amountNum >= 1 && date !== null;

  function chooseActivity(name: string, defaultUnit: Unit) {
    // Switching to an activity with a different natural unit clears an amount that no longer fits.
    if (defaultUnit !== unit) setAmount("");
    setActivity(name);
    setUnit(defaultUnit);
  }

  function bump(delta: number) {
    setAmount(String(Math.min(999, Math.max(1, (Number(amount) || 0) + delta))));
  }

  const whenLabel =
    date === today
      ? "today"
      : date === shiftDate(today, -1)
        ? "yesterday"
        : date
          ? formatUK(date)
          : "…";

  return (
    <form
      action={formAction}
      className="grid gap-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-emerald-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
    >
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Log a workout</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Pick what you did, then how much.
        </p>
      </div>

      <input type="hidden" name="activity" value={activity} />
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="occurredOn" value={dateText} />

      <Step n={1} title="What did you do?">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {ACTIVITIES.map((a) => {
            const on = activity === a.activity;
            return (
              <button
                key={a.activity}
                type="button"
                aria-pressed={on}
                onClick={() => chooseActivity(a.activity, a.unit)}
                className={`grid justify-items-center gap-1 rounded-2xl border px-1 py-2.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 active:scale-95 ${
                  on
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-md ring-2 shadow-emerald-600/20 ring-emerald-500 dark:bg-emerald-950 dark:text-emerald-100"
                    : "border-slate-200 bg-white/80 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {activityEmoji(a.activity)}
                </span>
                <span className="w-full truncate text-center">{a.label}</span>
              </button>
            );
          })}
        </div>
        <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Or type your own
          <input
            type="text"
            maxLength={80}
            autoComplete="off"
            placeholder="e.g. Badminton"
            value={ACTIVITIES.some((a) => a.activity === activity) ? "" : activity}
            onChange={(e) => setActivity(e.target.value)}
            className={FIELD}
          />
        </label>
      </Step>

      <Step n={2} title="How much?">
        <div
          className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800"
          role="group"
          aria-label="Unit"
        >
          {(["min", "reps"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => {
                if (u !== unit) setAmount("");
                setUnit(u);
              }}
              className={`rounded-full py-1.5 text-sm font-semibold transition ${
                unit === u
                  ? "bg-white text-emerald-700 shadow dark:bg-slate-700 dark:text-emerald-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {u === "min" ? "⏱️ Minutes" : "🔁 Reps"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Amount presets">
          {AMOUNT_PRESETS[unit].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={amount === String(n)}
              onClick={() => setAmount(String(n))}
              className={`${CHIP} ${amount === String(n) ? CHIP_ON : CHIP_OFF}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease amount"
            onClick={() => bump(-1)}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={999}
            step={1}
            inputMode="numeric"
            aria-label={`Amount in ${unit === "min" ? "minutes" : "reps"}`}
            placeholder={`Or type ${unit === "min" ? "minutes" : "reps"}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${FIELD} w-full text-center`}
          />
          <button
            type="button"
            aria-label="Increase amount"
            onClick={() => bump(1)}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200"
          >
            +
          </button>
        </div>
      </Step>

      <Step n={3} title="When?">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Today", days: 0 },
            { label: "Yesterday", days: -1 },
            { label: "2 days ago", days: -2 },
          ].map((d) => {
            const iso = shiftDate(today, d.days);
            const on = date === iso;
            return (
              <button
                key={d.label}
                type="button"
                aria-pressed={on}
                onClick={() => setDateText(formatUK(iso))}
                className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                {d.label}
              </button>
            );
          })}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            aria-label="Date (DD/MM/YYYY)"
            placeholder="DD/MM/YYYY"
            value={dateText}
            onChange={(e) => setDateText(autoSlash(e.target.value))}
            className={`${FIELD} w-32 text-center ${date === null && dateText.length > 0 ? "border-rose-400" : ""}`}
          />
        </div>
      </Step>

      <button
        type="submit"
        disabled={pending || !ready}
        className="rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-4 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-600/30 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
      >
        {pending
          ? "Saving…"
          : ready
            ? `Log ${activity} · ${amountNum} ${unit} · ${whenLabel}`
            : "Pick an activity and an amount"}
      </button>

      <p role="status" aria-live="polite" className="-mt-3 min-h-5 text-center text-sm font-medium">
        {state.error ? (
          <span className="text-rose-700 dark:text-rose-400">{state.error}</span>
        ) : state.ok ? (
          <span className="text-emerald-700 dark:text-emerald-400">🎉 Logged. Nice work!</span>
        ) : null}
      </p>
    </form>
  );
}
