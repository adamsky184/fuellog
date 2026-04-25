/**
 * v2.9.12 — FillUpRow: client component wrapper for one row of the
 * fill-ups table. Switched away from the absolute-Link/stretched-link
 * pattern — `position: relative/absolute` on a `<tr>` is poorly
 * supported across browsers (Chrome and Firefox historically don't
 * respect it for absolute children) and the absolute layer was
 * intercepting hover on the topmost rows.
 *
 * This version uses an `onClick` handler that routes via Next, so the
 * <tr>:hover CSS fires reliably and no extra elements stack on top.
 */
"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function FillUpRow({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={(e) => {
        // Don't intercept text-selection drag.
        const target = e.target as HTMLElement;
        if (target.closest("a,button")) return;
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className="group border-t border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
    >
      {children}
    </tr>
  );
}
