import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Card surface for a research section (table.md container: card-bg, radius xl, 16px padding). */
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
    <section id={id} aria-labelledby={id && title ? `${id}-title` : undefined} className={cn("min-w-0 scroll-mt-24 rounded-xl bg-card p-4 shadow-sm light:shadow-black/8 md:p-5", className)}>
      {(title || aside) && (
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="text-base font-semibold text-high">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-med">{description}</p>}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, meta, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="pt-24 pb-6 md:pt-28">
      {eyebrow && <p className="mb-2 text-2xs font-medium tracking-widest text-med uppercase">{eyebrow}</p>}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance text-high md:text-3xl">{title}</h1>
          {description && <div className="mt-3 max-w-3xl text-sm leading-relaxed text-med">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {meta && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-med">{meta}</div>}
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
    <div className="rounded-lg border border-dashed border-line-med px-4 py-8 text-center">
      <p className="text-sm font-semibold text-high">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-med">{children}</div>}
    </div>
  );
}
