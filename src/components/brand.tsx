import { HeartPulse } from "lucide-react";

export const APP_NAME = "Tandem";
export const APP_TAGLINE = "Move together, wherever you are.";

/** The app's logo tile. */
export function BrandMark({ className = "size-10" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 via-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/30 ${className}`}
    >
      <HeartPulse className="size-[55%]" strokeWidth={2.5} />
    </span>
  );
}
