import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");

  return (
    <main className="mx-auto grid max-w-sm gap-6 px-4 py-24 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workout Tracker</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-neutral-400">
          Sign in with the Google account on the allowed list.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
