# CLAUDE.md

Shared workout log for two people in different places. Entries like "Walking 15 min", "Squats 10 min", "Knee band 10 reps". Both users see every entry; each user can remove only their own.

## Stack
Next.js (App Router, TypeScript strict) · Tailwind v4 · Zod · Auth.js v5 (Google, JWT sessions, allow-list via `ALLOWED_EMAILS`) · Drizzle ORM · Neon Postgres · Vercel · Vitest

Same stack as the Finance Tracker repo, so the same habits apply.

## Commands
- `npm run dev`: local dev server
- `npm run check`: lint + format check + typecheck + unit tests. Run before saying a change is done.
- `npm run db:generate`: create a migration from `src/db/schema.ts`
- `npm run db:migrate`: apply migrations (reads `DATABASE_URL` from `.env.local`)

## Layout
```
src/app/          routes (App Router). Server components by default.
src/app/actions.ts  server actions (add, delete). Zod-validated, ownership checked.
src/db/schema.ts  Drizzle schema (the only place tables are defined)
src/lib/          pure logic (workouts, IST dates, weekly totals), unit-tested
src/components/   client components (the add form)
drizzle/          generated migrations. Never hand-edit.
```

## Rules
1. **Dates are IST** (`Asia/Kolkata`). `occurred_on` is a `YYYY-MM-DD` string. Use `todayIST()` and `shiftDate()` from `src/lib/workouts.ts`.
2. **Who logged it is recorded** (`user_id`). Only the person who logged an entry can remove it. Anyone on `ALLOWED_EMAILS` can read the shared log.
3. **Auth on every page** except `/login`. Pages call `auth()` and redirect when signed out.
4. **Validation with Zod**, in `workoutInputSchema`, used by the server action.
5. **Schema changes only via migrations** (`db:generate` → review SQL → `db:migrate`). Never edit files in `drizzle/`.
6. **No secrets in code.** Use env vars and update `.env.example` when adding one.
7. **Business logic in `src/lib/` as pure functions** with unit tests. Server actions stay thin.
8. **Totals count minutes only.** Reps are shown per entry but never added together.

## Style
- Server components by default. `"use client"` only where interactivity needs it.
- Mobile-first. Logging a workout must be quick on a phone.
- Keep components small. No premature abstraction.
