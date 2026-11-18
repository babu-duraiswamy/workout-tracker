"use client";

import { deleteWorkout } from "@/app/actions";

/** Remove button that asks first, so a stray tap on a phone can't delete an entry. */
export function DeleteButton({ id, activity }: { id: string; activity: string }) {
  return (
    <form
      action={deleteWorkout.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm(`Remove "${activity}"?`)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        aria-label={`Remove ${activity}`}
        title="Remove"
        className="grid size-9 place-items-center rounded-full text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-rose-500 dark:hover:bg-rose-950"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </form>
  );
}
