import { options } from "@/lib/lambo/api/http";
import { launchpadsPaid } from "@/lib/lambo/api/routes";
import { SITE_URL } from "@/lib/links";

export const GET = (request: Request) => launchpadsPaid(request, SITE_URL);
export const OPTIONS = options;
