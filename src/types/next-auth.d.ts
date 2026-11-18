import type { DefaultSession } from "next-auth";

// Adds the database user id to the session (set in src/auth.ts).
declare module "next-auth" {
  interface Session {
    user: { id?: string } & DefaultSession["user"];
  }
}
