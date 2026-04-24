import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * Robots policy. Public marketing pages (`/`, `/login`) are indexable;
 * everything behind auth (`/v/*`, `/admin/*`, `/profile`, `/api/*`) is
 * disallowed so search engines don't trip over unauthenticated redirects.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: ["/api/", "/admin/", "/v/", "/profile", "/auth/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
