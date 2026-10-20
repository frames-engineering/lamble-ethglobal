import { apiExamples } from "@/lib/lamble/api/examples";
import { json, options, route } from "@/lib/lamble/api/http";
import { openapi } from "@/lib/lamble/api/openapi";
import { loadPricing } from "@/lib/lamble/payments/pricing";
import { SITE_URL } from "@/lib/links";

export const GET = () =>
  route(async () => {
    let pricing = null;
    try {
      pricing = loadPricing();
    } catch {
      pricing = null;
    }
    return json(openapi(SITE_URL, pricing, await apiExamples(SITE_URL)));
  });
export const OPTIONS = options;
