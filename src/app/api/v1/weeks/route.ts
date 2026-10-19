import { options } from "@/lib/lambo/api/http";
import { weeks } from "@/lib/lambo/api/routes";

export const GET = (request: Request) => weeks(request);
export const OPTIONS = options;
