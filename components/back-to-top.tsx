/**
 * v2.9.7 — Floating "Back to top" button.
 *
 * Appears bottom-right after the user has scrolled past ~600 px. Click
 * smooth-scrolls to the top. Mounted in the (app) layout so it's
 * available on every authenticated page.
 */
"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Zpět nahoru"
      className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-2 rounded-full
                 bg-slate-900/90 text-white backdrop-blur shadow-lg ring-1 ring-white/10
                 hover:bg-slate-900 transition text-xs sm:text-sm
                 dark:bg-slate-100/90 dark:text-slate-900 dark:ring-slate-900/10"
    >
      <ArrowUp className="h-4 w-4" />
      <span className="hidden sm:inline">Nahoru</span>
    </button>
  );
}
