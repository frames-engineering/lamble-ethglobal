import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Bordered card for one block of content: a chart, a table, a list (docs/design/overhaul-2026-11.md).
 * Hairline border on the page color, no fill, no shadow; its own small heading when it needs one.
 */
export function Panel({
  title,
  description,
  aside,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} aria-labelledby={id && title ? `${id}-title` : undefined} className={cn("min-w-0 rounded-sm border border-line p-4 md:p-5", className)}>
      {(title || description || aside) && (
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {/* h3: panels sit inside a page Section, whose heading is the h2. */}
            {title && (
              <h3 id={id ? `${id}-title` : undefined} className="text-base font-medium text-high">
                {title}
              </h3>
            )}
            {description && <p className="mt-1 max-w-[72ch] text-sm text-pretty text-med">{description}</p>}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Page-level section: a 20px heading, one line on what it shows, then the content (usually a Panel or a
 * table). The aside holds the section's single onward link, usually a MoreLink.
 */
export function Section({
  id,
  title,
  description,
  aside,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("min-w-0 pt-16", className)}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={id ? `${id}-title` : undefined} className="flex items-center gap-1.5 text-xl font-medium text-high">
          {title}
        </h2>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {description && <p className="mt-2 max-w-[72ch] text-sm text-pretty text-med">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** "All narratives →": the one onward link a section or panel offers. */
export function MoreLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("relative inline-flex items-center gap-1 text-sm text-med transition-colors duration-150 before:absolute before:-inset-2 pointer-coarse:before:-inset-y-3 hover:text-high", className)}>
      {children}
      <ArrowRightIcon aria-hidden className="size-3.5" />
    </Link>
  );
}

/**
 * Page title block: Geist Pixel title, a lede of at most a few lines, and actions (a Methodology link, a filter).
 * The eyebrow names the kind of page; meta carries dates and identifiers in small type.
 */
/**
 * `aside` takes the right of the header (a headline visual, such as the overview's trench index). With one, the
 * lede narrows and the actions move under it, so the title block reads as one column beside the aside.
 *
 * `enter` plays the overview's first-load entrance: title, then lede and aside, then actions and meta, each a
 * step of the `rise-*` utility (globals.css). Other pages render static.
 */
const RISE = ["rise-0", "rise-1", "rise-2"] as const;

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  aside,
  enter = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  enter?: boolean;
}) {
  const rise = (step: 0 | 1 | 2) => (enter ? RISE[step] : undefined);
  return (
    <header className="pt-10 pb-2 md:pt-14">
      {eyebrow && <p className={cn("mb-3 text-xs text-med", rise(0))}>{eyebrow}</p>}
      <div className={cn("flex flex-col gap-5 md:flex-row md:justify-between", aside ? "md:items-center md:gap-10" : "md:items-end")}>
        <div className="min-w-0">
          <h1 className={cn("font-display text-4xl leading-[1.1] text-balance text-high md:text-5xl", rise(0))}>{title}</h1>
          {description && <div className={cn("mt-3 text-base text-pretty text-med", aside ? "max-w-[50ch]" : "max-w-[62ch]", rise(1))}>{description}</div>}
          {aside && actions && <div className={cn("mt-6 flex flex-wrap gap-2", rise(2))}>{actions}</div>}
        </div>
        {aside ? <div className={cn("shrink-0", rise(1))}>{aside}</div> : actions && <div className={cn("flex shrink-0 flex-wrap gap-2", rise(2))}>{actions}</div>}
      </div>
      {meta && <div className={cn("mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-med", rise(2))}>{meta}</div>}
    </header>
  );
}

/** Plain-language limitation or scope note. Shown, not hidden in a tooltip. */
export function Note({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "warning"; className?: string }) {
  return (
    <p role="note" className={cn("rounded-lg px-3 py-2 text-xs leading-relaxed", tone === "warning" ? "bg-warning-soft text-med" : "bg-surface-2 text-med", className)}>
      {children}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-sm border border-dashed border-line-med px-4 py-8 text-center">
      <p className="text-sm font-medium text-high">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-med">{children}</div>}
    </div>
  );
}
