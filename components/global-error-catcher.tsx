"use client";

/**
 * v2.11.0 — installs the global window error / unhandled-rejection
 * listeners exactly once. Render this once in the (app) layout so every
 * client-side throw / rejection turns into an `error_log` row.
 */

import { useEffect } from "react";
import { installGlobalErrorHandlers } from "@/lib/log-error";

export function GlobalErrorCatcher() {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);
  return null;
}
