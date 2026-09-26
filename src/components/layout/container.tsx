import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Page-width wrapper: 1216px of content at 1280, 16px gutters on phones. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 md:px-8", className)} {...props} />;
}
