/**
 * v2.16.0 — single Alert primitive used across every form / list /
 * settings page, replacing 12+ inconsistent inline error blocks.
 *
 * Tones: "info" (neutral note), "success", "warn", "danger", "muted".
 * Each gets a paired card-style border + bg + icon. Defaults to
 * "danger" so the common case stays a one-liner: <Alert>{error}</Alert>.
 */

import { AlertTriangle, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "danger" | "warn" | "success" | "info" | "muted";

const TONE_CONFIG: Record<Tone, { wrap: string; icon: ReactNode }> = {
  danger: {
    wrap: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200",
    icon: <AlertCircle className="h-4 w-4 shrink-0" />,
  },
  warn: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
  },
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  },
  info: {
    wrap: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200",
    icon: <Info className="h-4 w-4 shrink-0" />,
  },
  muted: {
    wrap: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    icon: <Info className="h-4 w-4 shrink-0 opacity-70" />,
  },
};

export function Alert({
  tone = "danger",
  className,
  children,
  hideIcon,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  hideIcon?: boolean;
}) {
  const cfg = TONE_CONFIG[tone];
  return (
    <div
      role={tone === "danger" || tone === "warn" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        cfg.wrap,
        className,
      )}
    >
      {!hideIcon && <span className="mt-0.5">{cfg.icon}</span>}
      <div className="min-w-0 flex-1 leading-snug">{children}</div>
    </div>
  );
}
