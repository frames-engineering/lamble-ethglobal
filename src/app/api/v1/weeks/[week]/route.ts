import { options } from "@/lib/lambo/api/http";
import { week } from "@/lib/lambo/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ week: string }> }) {
  return week(request, await params);
}
export const OPTIONS = options;
