import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");

  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-8 px-4 py-16 text-center">
      <div className="grid justify-items-center gap-4">
        <span className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 via-sky-500 to-fuchsia-500 text-4xl shadow-lg shadow-emerald-500/30">
          💪
        </span>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Workout Tracker</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Small wins, every day, together.
          </p>
        </div>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 font-semibold text-white shadow-md shadow-emerald-600/30 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 active:scale-[0.98]"
        >
          Sign in with Google
        </button>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Use the Google account on the allowed list.
        </p>
      </form>
    </main>
  );
}
