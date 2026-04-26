/**
 * v2.9.0 — VehicleAvatar
 *
 * Tiny avatar that renders either:
 *  - the vehicle's photo (lazily-signed URL from the `photos` bucket), or
 *  - a circular color swatch as fallback (matches the previous look).
 *
 * Used in the vehicle list, the vehicle switcher, and the per-vehicle
 * page title so the brand mark is consistent across all views.
 *
 * Signed URLs are cached in module scope so we don't hit the storage API
 * once per render.
 */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SIGNED_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();
const TTL_MS = 55 * 60 * 1000; // 55 minutes; bucket signs for 1h

async function signPath(path: string): Promise<string | null> {
  // v2.9.1 — paths beginning with "/" are bundled public assets (e.g.
  // /vehicle-logos/audi.png) and don't need a signed URL.
  if (path.startsWith("/")) return path;
  const cached = SIGNED_URL_CACHE.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const supabase = createClient();
  const { data } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
  if (!data?.signedUrl) return null;
  SIGNED_URL_CACHE.set(path, { url: data.signedUrl, expiresAt: Date.now() + TTL_MS });
  return data.signedUrl;
}

const SIZE_TO_PX = { sm: 24, md: 32, lg: 48, xl: 80 } as const;

export function VehicleAvatar({
  photoPath,
  color,
  size = "md",
  className = "",
}: {
  photoPath: string | null | undefined;
  color: string | null | undefined;
  size?: keyof typeof SIZE_TO_PX;
  className?: string;
}) {
  const px = SIZE_TO_PX[size];
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!photoPath) {
      setUrl(null);
      return;
    }
    signPath(photoPath).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  if (photoPath && url) {
    // v2.9.2 — `object-contain` instead of `object-cover` so wide logos
    // (Škoda, Infiniti, Lambo) aren't cropped. Tile background = white so
    // the logo still has a clean frame regardless of source colour.
    // v2.14.5 — when the user has set a vehicle colour AND there is a
    //   logo, paint the ring around the avatar in that colour. Subtle
    //   2 px hairline so it reads as identification, not decoration.
    const ringStyle = color
      ? { boxShadow: `0 0 0 2px ${color}`, borderColor: "transparent" }
      : undefined;
    return (
      <span
        className={`rounded-full border border-slate-200 dark:border-slate-700 shrink-0 grid place-items-center bg-white overflow-hidden ${className}`}
        style={{ width: px, height: px, ...ringStyle }}
      >
        <Image
          src={url}
          alt=""
          width={px}
          height={px}
          unoptimized
          className="object-contain"
          style={{ maxWidth: "82%", maxHeight: "82%" }}
        />
      </span>
    );
  }
  return (
    <span
      className={`inline-block rounded-full border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}
      style={{ width: px, height: px, backgroundColor: color ?? "#cbd5e1" }}
      aria-hidden
    />
  );
}
