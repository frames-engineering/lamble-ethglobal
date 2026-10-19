import { options } from "@/lib/lambo/api/http";
import { narrative } from "@/lib/lambo/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return narrative(request, await params);
}
export const OPTIONS = options;
