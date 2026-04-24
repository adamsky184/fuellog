import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * Static sitemap for the public pages. Everything that needs auth is
 * deliberately excluded — search engines would only hit a redirect.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
