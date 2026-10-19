import { options } from "@/lib/lambo/api/http";
import { changes } from "@/lib/lambo/api/routes";

export const GET = (request: Request) => changes(request);
export const OPTIONS = options;
