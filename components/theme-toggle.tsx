"use client";

/**
 * Light/dark toggle. Preference is mirrored in both localStorage (for the
 * no-flash inline script) and a cookie (so SSR could read it later if needed).
 */

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/icon-button";

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

  // SSR placeholder + active button — single component, identický styl.
  if (!mounted) {
    return (
      <IconButton aria-label="Přepnout tmavý režim" title="Přepnout tmavý režim">
        <Sun className="h-4 w-4" />
      </IconButton>
    );
  }

  return (
    <IconButton
      onClick={toggle}
      aria-label={theme === "dark" ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
      title={theme === "dark" ? "Světlý režim" : "Tmavý režim"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </IconButton>
  );
}
