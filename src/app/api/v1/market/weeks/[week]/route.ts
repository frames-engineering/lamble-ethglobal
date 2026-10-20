import { options } from "@/lib/lamble/api/http";
import { week } from "@/lib/lamble/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ week: string }> }) {
  return week(request, await params);
}
export const OPTIONS = options;
