"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary inline-flex items-center gap-1 text-xs"
      type="button"
    >
      <Printer className="h-3.5 w-3.5" />
      Tisknout / uložit PDF
    </button>
  );
}
