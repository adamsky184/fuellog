"use client";

/**
 * Light/dark toggle. Preference is mirrored in both localStorage (for the
 * no-flash inline script) and a cookie (so SSR could read it later if needed).
 */

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    localStorage.setItem("fuellog-theme", theme);
    document.cookie = `fuellog-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    /* private mode */
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readInitialTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  // Render a placeholder during SSR so the icon doesn't flicker.
  if (!mounted) {
    return (
      <button
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        aria-label="Přepnout tmavý režim"
        title="Přepnout tmavý režim"
        type="button"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="btn-secondary text-xs inline-flex items-center gap-1"
      aria-label={theme === "dark" ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
      title={theme === "dark" ? "Světlý režim" : "Tmavý režim"}
      type="button"
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
