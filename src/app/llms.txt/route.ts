import { llmsTxt } from "@/lib/lambo/site/llms";
import { loadRelease } from "@/lib/lambo/service";
import { FRAMES_LISTED, SITE_URL } from "@/lib/links";

export const dynamic = "force-static";

export function GET() {
  const { data } = loadRelease();
  const body = llmsTxt(SITE_URL, { releaseId: data.releaseId, dataCutoff: data.dataCutoff, coins: data.coins.length, narratives: data.narratives.length, framesListed: FRAMES_LISTED });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
