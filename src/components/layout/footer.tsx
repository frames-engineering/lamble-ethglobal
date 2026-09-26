import { Logo } from "@/components/brand/logo";

/** Footer is the wordmark only, edge to edge: page gutter, no max width. */
export function Footer() {
  return (
    <footer className="px-4 pt-10 pb-4 md:px-8 md:pb-8">
      <Logo className="h-auto w-full" />
    </footer>
  );
}
