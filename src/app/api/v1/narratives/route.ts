import { options } from "@/lib/lamble/api/http";
import { narratives } from "@/lib/lamble/api/routes";

export const GET = (request: Request) => narratives(request);
export const OPTIONS = options;
