"use client";

/**
 * v2.14.0 — small client wrapper that derives the current vehicle id
 * from the URL and mounts <CommandPalette/> with the right props.
 * Layout-level so ⌘K works on every authenticated route.
 */

import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/command-palette";

export function CommandPaletteMount({
  vehicles,
  isAdmin,
}: {
  vehicles: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const currentVehicleId = pathname?.match(/^\/v\/([^/]+)/)?.[1] ?? null;
  return (
    <CommandPalette
      vehicles={vehicles}
      currentVehicleId={currentVehicleId}
      isAdmin={isAdmin}
    />
  );
}
