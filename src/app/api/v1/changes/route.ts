import { options } from "@/lib/lamble/api/http";
import { changes } from "@/lib/lamble/api/routes";

export const GET = (request: Request) => changes(request);
export const OPTIONS = options;
