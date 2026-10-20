import { options } from "@/lib/lamble/api/http";
import { research } from "@/lib/lamble/api/routes";

export const GET = (request: Request) => research(request);
export const OPTIONS = options;
