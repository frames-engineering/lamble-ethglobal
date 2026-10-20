import { options } from "@/lib/lamble/api/http";
import { launchpadsPaid } from "@/lib/lamble/api/routes";
import { SITE_URL } from "@/lib/links";

export const GET = (request: Request) => launchpadsPaid(request, SITE_URL);
export const OPTIONS = options;
