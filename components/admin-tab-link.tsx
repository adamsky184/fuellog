"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

/**
 * Tab link for the admin nav. Client component because `usePathname` is the
 * cleanest way to highlight the active tab — the admin layout stays a server
 * component (needed for the auth check) and hands off just this one bit.
 */
export function AdminTabLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      className={`px-3.5 py-2 rounded-t-lg inline-flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px transition ${
        active
          ? "border-sky-500 text-sky-600 dark:text-sky-400"
          : "border-transparent text-slate-600 hover:text-ink hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
