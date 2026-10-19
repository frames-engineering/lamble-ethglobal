import { options } from "@/lib/lambo/api/http";
import { research } from "@/lib/lambo/api/routes";

export const GET = (request: Request) => research(request);
export const OPTIONS = options;
