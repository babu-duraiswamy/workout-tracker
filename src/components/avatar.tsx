/** Two fixed tones: the signed-in viewer is always orange, the other person indigo. */
export const TONES = {
  you: {
    avatar: "bg-gradient-to-br from-orange-400 to-rose-600 text-white",
    card: "from-orange-500 to-rose-600",
    text: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
    chip: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  },
  other: {
    avatar: "bg-gradient-to-br from-sky-400 to-indigo-600 text-white",
    card: "from-sky-500 to-indigo-600",
    text: "text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  },
} as const;

export type Tone = keyof typeof TONES;

export function Avatar({
  name,
  tone,
  size = "md",
}: {
  name: string;
  tone: Tone;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "size-7 text-xs" : "size-10 text-base";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-bold shadow-sm ${dims} ${TONES[tone].avatar}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
