import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Content column beside the sidebar: 1120px of content at most, 20px gutters on phones, 40px on desktop. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1120px] px-5 md:px-10", className)} {...props} />;
}
