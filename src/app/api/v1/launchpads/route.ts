import { options } from "@/lib/lambo/api/http";
import { launchpads } from "@/lib/lambo/api/routes";

export const GET = (request: Request) => launchpads(request);
export const OPTIONS = options;
