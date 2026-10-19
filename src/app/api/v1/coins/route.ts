import { options } from "@/lib/lambo/api/http";
import { coins } from "@/lib/lambo/api/routes";

export const GET = (request: Request) => coins(request);
export const OPTIONS = options;
