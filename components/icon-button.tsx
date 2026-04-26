"use client";

/**
 * v2.19.4 — sjednocený IconButton pro hlavičku.
 *
 * Tři předchozí pokusy (v2.18.x, v2.19.1, v2.19.3) sjednotit AccentToggle
 * + ThemeToggle + hamburger nestačily — Adam pořád viděl hamburger
 * "mimo". Důvod: každé tlačítko mělo vlastní className, lehko se to
 * rozsynchroovalo s `replace_all` editem nebo když nějaký wrapper div
 * přidal default `display: block`, který v některých browserech posune
 * baseline o pixel.
 *
 * Tato komponenta je single source of truth: stejný shape pro každé
 * icon-only tlačítko v hlavičce. Stačí ji použít všude a přestaneme
 * driftovat.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Pokud true, tlačítko se obarví accentem (pro primary actions). */
  accent?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ children, accent, className = "", ...rest }, ref) {
    const base =
      "inline-flex items-center justify-center w-9 h-9 rounded-lg transition shrink-0";
    const tone = accent
      ? "bg-accent text-white shadow-sm ring-1 ring-white/20 hover:brightness-110 active:scale-95"
      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800";
    return (
      <button
        ref={ref}
        type="button"
        className={`${base} ${tone} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
