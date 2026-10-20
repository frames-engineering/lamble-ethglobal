import { options } from "@/lib/lamble/api/http";
import { narrative } from "@/lib/lamble/api/routes";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return narrative(request, await params);
}
export const OPTIONS = options;
