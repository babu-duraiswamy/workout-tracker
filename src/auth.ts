import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ensureUser } from "@/lib/users";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Emails allowed to sign in, from ALLOWED_EMAILS (comma-separated). */
function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: THIRTY_DAYS },
  pages: { signIn: "/login", error: "/login" },
  providers: [Google],
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email?.toLowerCase();
      const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      return Boolean(email && verified === true && allowedEmails().includes(email));
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await ensureUser(user.email, user.name);
        token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
