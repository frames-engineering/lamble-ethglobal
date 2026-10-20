import { options } from "@/lib/lamble/api/http";
import { article } from "@/lib/lamble/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return article(request, await params);
}
export const OPTIONS = options;
