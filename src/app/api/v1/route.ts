import { options } from "@/lib/lamble/api/http";
import { index } from "@/lib/lamble/api/routes";
import { SITE_URL } from "@/lib/links";

export const GET = (request: Request) => index(request, SITE_URL);
export const OPTIONS = options;
