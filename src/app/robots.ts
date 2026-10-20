import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/links";

/** Public pages are crawlable; paid API resources are not pages and are excluded. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/v1/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
