import { options } from "@/lib/lambo/api/http";
import { index } from "@/lib/lambo/api/routes";
import { SITE_URL } from "@/lib/links";

export const GET = (request: Request) => index(request, SITE_URL);
export const OPTIONS = options;
