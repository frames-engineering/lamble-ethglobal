import { options } from "@/lib/lambo/api/http";
import { weekPaid } from "@/lib/lambo/api/routes";
import { SITE_URL } from "@/lib/links";

export async function GET(request: Request, { params }: { params: Promise<{ week: string }> }) {
  return weekPaid(request, await params, SITE_URL);
}
export const OPTIONS = options;
