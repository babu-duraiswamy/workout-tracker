/**
 * Database schema. The only place tables are defined.
 *
 * Rules:
 * - `occurred_on` is a calendar date in IST ("YYYY-MM-DD"), not a timestamp.
 * - Every workout records who logged it (`user_id`).
 * - Schema changes only via migrations: `npm run db:generate`, then `npm run db:migrate`.
 */
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const workoutUnitEnum = pgEnum("workout_unit", ["min", "reps"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    activity: text("activity").notNull(),
    amount: integer("amount").notNull(),
    unit: workoutUnitEnum("unit").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workouts_occurred_on_idx").on(t.occurredOn),
    check("workouts_amount_positive", sql`${t.amount} > 0`),
  ],
);
