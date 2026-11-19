import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Tandem",
  description: "Move together, wherever you are. A shared workout log for two.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ed" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={roboto.variable}>
      <body className="min-h-dvh bg-gradient-to-br from-orange-50 via-rose-50 to-indigo-50 bg-fixed text-slate-900 antialiased dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
