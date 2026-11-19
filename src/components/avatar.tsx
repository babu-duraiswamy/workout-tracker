/** Two fixed tones: the signed-in viewer is always emerald, the other person violet. */
export const TONES = {
  you: {
    avatar: "bg-gradient-to-br from-emerald-400 to-teal-600 text-white",
    card: "from-emerald-500 to-teal-600",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  other: {
    avatar: "bg-gradient-to-br from-fuchsia-400 to-violet-600 text-white",
    card: "from-fuchsia-500 to-violet-600",
    text: "text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
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
