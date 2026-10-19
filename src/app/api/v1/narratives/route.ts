import { options } from "@/lib/lambo/api/http";
import { narratives } from "@/lib/lambo/api/routes";

export const GET = (request: Request) => narratives(request);
export const OPTIONS = options;
