import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "A shared workout log for two",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecfdf5" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh bg-gradient-to-br from-emerald-50 via-sky-50 to-fuchsia-50 bg-fixed text-slate-900 antialiased dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
