import { options } from "@/lib/lamble/api/http";
import { coin } from "@/lib/lamble/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ chain: string; address: string }> }) {
  return coin(request, await params);
}
export const OPTIONS = options;
