"use client";

import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions";

/**
 * Remove one entry. Lives inside the log's form, so it uses `formAction` instead of its own form.
 * Asks first, so a stray tap on a phone can't delete an entry.
 */
export function DeleteButton({
  id,
  activity,
  className = "",
}: {
  id: string;
  activity: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      formAction={deleteWorkout.bind(null, id)}
      onClick={(e) => {
        if (!window.confirm(`Remove "${activity}"?`)) e.preventDefault();
      }}
      aria-label={`Remove ${activity}`}
      title="Remove"
      className={`grid size-9 place-items-center rounded-full text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-rose-500 dark:hover:bg-rose-950 ${className}`}
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </button>
  );
}
