import { options } from "@/lib/lambo/api/http";
import { article } from "@/lib/lambo/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return article(request, await params);
}
export const OPTIONS = options;
