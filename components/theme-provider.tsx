"use client";

import { createContext, useContext, useState } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise from the class already set by the FOUC inline script.
  // The inline script has already applied the correct html class before React
  // hydrates, so we just read the DOM — no extra effect needed.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "dark"; // SSR default — matches FOUC script default
  });

  const setTheme = (t: Theme) => {
    const html = document.documentElement;

    // Temporarily add transition class for smooth crossfade.
    html.classList.add("theme-transitioning");
    applyThemeClass(t);
    setThemeState(t);
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
