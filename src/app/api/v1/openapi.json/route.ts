import { json, options, route } from "@/lib/lambo/api/http";
import { openapi } from "@/lib/lambo/api/openapi";
import { loadPricing } from "@/lib/lambo/payments/pricing";
import { SITE_URL } from "@/lib/links";

export const GET = () =>
  route(() => {
    let pricing = null;
    try {
      pricing = loadPricing();
    } catch {
      pricing = null;
    }
    return json(openapi(SITE_URL, pricing));
  });
export const OPTIONS = options;
