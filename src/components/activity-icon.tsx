import {
  Activity,
  Bike,
  Dumbbell,
  Flower2,
  Footprints,
  Mountain,
  Music,
  PersonStanding,
  Target,
  Waves,
  Zap,
  Cable,
  StretchHorizontal,
  type LucideIcon,
} from "lucide-react";
import { activityKind, type ActivityKind } from "@/lib/workouts";

const ICONS: Record<ActivityKind, LucideIcon> = {
  walk: Footprints,
  run: Zap,
  legs: PersonStanding,
  band: Cable,
  mind: Flower2,
  stretch: StretchHorizontal,
  cycle: Bike,
  swim: Waves,
  lift: Dumbbell,
  dance: Music,
  core: Target,
  climb: Mountain,
  other: Activity,
};

/** The icon for an activity name. Decorative: the name is always shown next to it. */
export function ActivityIcon({ activity, className }: { activity: string; className?: string }) {
  const Icon = ICONS[activityKind(activity)];
  return <Icon aria-hidden="true" strokeWidth={2.25} className={className ?? "size-6"} />;
}
