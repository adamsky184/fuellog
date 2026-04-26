"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Tab link for the admin nav. Client component because `usePathname` is the
 * cleanest way to highlight the active tab — the admin layout stays a server
 * component (needed for the auth check) and hands off just this one bit.
 *
 * `icon` is a pre-rendered JSX element (ReactNode), NOT a component function.
 * v2.4.7: passing a LucideIcon component function across the server→client
 * boundary is the RSC anti-pattern that throws "Functions cannot be passed
 * directly to Client Components" at render time — after our outer try/catch
 * has already returned — which showed up in production as the masked
 * digest-1715506935 crash on every /admin hit.
 */
export function AdminTabLink({
  href,
  label,
  icon,
  exact,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      className={`px-3.5 py-2 rounded-t-lg inline-flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px transition ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-slate-600 hover:text-ink hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
