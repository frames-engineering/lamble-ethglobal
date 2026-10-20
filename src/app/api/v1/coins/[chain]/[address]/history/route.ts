import { options } from "@/lib/lamble/api/http";
import { coinPaid } from "@/lib/lamble/api/routes";
import { SITE_URL } from "@/lib/links";

export async function GET(request: Request, { params }: { params: Promise<{ chain: string; address: string }> }) {
  return coinPaid(request, await params, "history", SITE_URL);
}
export const OPTIONS = options;
