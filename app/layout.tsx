import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import { DevTab } from "@/components/dev-tab/DevTab";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supaset",
  description: "Self-hosted analytics — charts, dashboards, and SQL Lab",
};

/** Inline script that runs before React hydrates, preventing FOUC. */
const themeScript = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
} catch (_) {
  document.documentElement.classList.add('dark');
}
`.trim();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention — must run synchronously before any paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
        style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
      >
        <ThemeProvider>
          <ReactQueryProvider>
            <SessionProvider>{children}</SessionProvider>
          </ReactQueryProvider>
          <ThemedToaster />
          <DevTab />
        </ThemeProvider>
      </body>
    </html>
  );
}
