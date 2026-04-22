/**
 * Shared labels and constants for maintenance entries.
 * `maintenance_kind` enum stays in sync with the DB migration.
 */

export type MaintenanceKind =
  | "oil_change"
  | "tires_change"
  | "stk"
  | "emise"
  | "service"
  | "repair"
  | "insurance"
  | "highway_sticker"
  | "other";

export const MAINTENANCE_LABELS: Record<MaintenanceKind, string> = {
  oil_change: "Výměna oleje",
  tires_change: "Přezutí / pneumatiky",
  stk: "STK (technická)",
  emise: "Emise",
  service: "Servis",
  repair: "Oprava",
  insurance: "Pojištění",
  highway_sticker: "Dálniční známka",
  other: "Jiné",
};

export const MAINTENANCE_KIND_ORDER: MaintenanceKind[] = [
  "oil_change",
  "tires_change",
  "stk",
  "emise",
  "service",
  "repair",
  "insurance",
  "highway_sticker",
  "other",
];
