import { options } from "@/lib/lamble/api/http";
import { weeks } from "@/lib/lamble/api/routes";

export const GET = (request: Request) => weeks(request);
export const OPTIONS = options;
