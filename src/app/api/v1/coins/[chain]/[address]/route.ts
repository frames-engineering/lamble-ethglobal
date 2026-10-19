import { options } from "@/lib/lambo/api/http";
import { coin } from "@/lib/lambo/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ chain: string; address: string }> }) {
  return coin(request, await params);
}
export const OPTIONS = options;
