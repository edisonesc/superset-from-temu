"use client";

import { createContext, useContext, useEffect, useState, startTransition } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with the SSR default ("dark").
  // The FOUC inline script has already applied the correct class to <html>
  // before React hydrates, so there is no visual flash. After mount we sync
  // React state to whatever the script actually set, using startTransition so
  // the update is non-urgent and the React Compiler doesn't flag it.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const resolved: Theme = stored === "light" ? "light" : "dark";
    applyThemeClass(resolved);
    startTransition(() => setThemeState(resolved));
  }, []);

  const setTheme = (t: Theme) => {
    const html = document.documentElement;

    // Temporarily add transition class for smooth crossfade.
    html.classList.add("theme-transitioning");
    applyThemeClass(t);
    startTransition(() => setThemeState(t));
    localStorage.setItem("theme", t);

    // Remove transition class after animation completes.
    const timer = setTimeout(() => {
      html.classList.remove("theme-transitioning");
    }, 260);

    return () => clearTimeout(timer);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyThemeClass(t: Theme) {
  if (t === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
