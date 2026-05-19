"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolved: "light" | "dark";
};

const STORAGE_KEY = "aeg-admin-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference === "dark" ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    const next = resolveTheme(theme);
    setResolved(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, theme);

    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      const r = resolveTheme("system");
      setResolved(r);
      applyTheme(r);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return ctx;
}
