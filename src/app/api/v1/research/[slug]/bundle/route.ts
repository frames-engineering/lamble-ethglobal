import { options } from "@/lib/lambo/api/http";
import { articlePaid } from "@/lib/lambo/api/routes";
import { SITE_URL } from "@/lib/links";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return articlePaid(request, await params, SITE_URL);
}
export const OPTIONS = options;
