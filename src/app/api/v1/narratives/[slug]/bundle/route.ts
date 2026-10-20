import { options } from "@/lib/lamble/api/http";
import { narrativePaid } from "@/lib/lamble/api/routes";
import { SITE_URL } from "@/lib/links";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return narrativePaid(request, await params, SITE_URL);
}
export const OPTIONS = options;
