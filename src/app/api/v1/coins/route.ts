import { options } from "@/lib/lamble/api/http";
import { coins } from "@/lib/lamble/api/routes";

export const GET = (request: Request) => coins(request);
export const OPTIONS = options;
