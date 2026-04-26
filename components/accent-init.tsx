"use client";

/**
 * v2.11.0 — applies the user's saved accent colour as soon as the app
 * shell hydrates. Renders nothing.
 */

import { useEffect } from "react";
import { applyAccent, loadAccent } from "@/lib/theme";

export function AccentInit() {
  useEffect(() => {
    applyAccent(loadAccent());
  }, []);
  return null;
}
