export const dynamic = "force-static";

import { rss } from "@/lib/lambo/site/feeds";
import { listArticles } from "@/lib/lambo/service";
import { SITE_URL } from "@/lib/links";

export function GET() {
  return new Response(rss(SITE_URL, listArticles().slice(0, 50)), { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
