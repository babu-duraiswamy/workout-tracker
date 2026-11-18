# Workout Tracker

A shared workout log for two people. Log things like "Walking 15 min", "Squats 10 min" or "Knee band 10 reps". Both of you see every entry. Each person can remove only their own.

Stack: Next.js · Tailwind v4 · Auth.js (Google) · Drizzle · Neon Postgres · Vercel. Rules for Claude Code are in [`CLAUDE.md`](CLAUDE.md).

## 1. Run it locally (VS Code)

```bash
npm install
cp .env.example .env.local     # then fill it in (see steps 2 and 3)
npm run check                  # lint, format, typecheck, unit tests
npm run dev                    # http://localhost:3000
```

## 2. Neon database

1. In Neon, open your project and create a `dev` branch.
2. Copy its connection string into `DATABASE_URL` in `.env.local`.
3. Apply the migration:

```bash
npm run db:migrate
```

The first migration is already in `drizzle/`. Run `npm run db:generate` only after you change `src/db/schema.ts`.

## 3. Google sign-in

Use the same Google OAuth client you set up for the Finance Tracker, or create a new one:

1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web).
2. Add these redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
3. Put the ID and secret in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
4. Set `AUTH_SECRET` (`npx auth secret` generates one).
5. Set `ALLOWED_EMAILS` to both of your Google emails, comma-separated.

Only those emails can sign in.

## 4. Deploy on Vercel

1. Push the repo to GitHub (see "Commits and pushes" below).
2. In Vercel, click Add New → Project and import the repo.
3. Add these environment variables in Vercel:
   - `DATABASE_URL`: the Neon **main** branch connection string (production)
   - `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`
4. Deploy.
5. Run the migration against production once, from your machine. Put the **main** `DATABASE_URL` in `.env.local` for this step, then run `npm run db:migrate`. Switch it back to `dev` afterwards.

Each deploy builds from the latest commit on `main`.

## 5. Working in VS Code with Claude Code

- Open the folder in VS Code. Accept the recommended extensions.
- Ask Claude Code for changes in the chat panel. Review the diff in the Source Control view.
- Run `npm run check` before committing. CI runs the same checks on every push.
- Commit with the Source Control view. Use short messages such as `feat(workouts): add weekly totals`.
- Push. Vercel rebuilds automatically.

## Commits and pushes

This repo was created locally, so connect it to GitHub once:

```bash
git add .
git commit -m "chore: initial workout tracker"
git remote add origin https://github.com/<your-user>/workout-tracker.git
git push -u origin main
```

Create the empty GitHub repo first (no README, no .gitignore), then run the commands above.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (what Vercel runs) |
| `npm run check` | Lint + format check + typecheck + unit tests |
| `npm test` | Unit tests (Vitest) |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations and DB browser |
