import { options } from "@/lib/lamble/api/http";
import { launchpads } from "@/lib/lamble/api/routes";

export const GET = (request: Request) => launchpads(request);
export const OPTIONS = options;
