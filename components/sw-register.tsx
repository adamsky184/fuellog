"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` on mount. Runs client-side only.
 * On production only — in dev the SW would cache stale assets between HMR reloads.
 */
export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        // Non-fatal — offline support just won't be available.
        console.warn("SW registration failed:", err);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
