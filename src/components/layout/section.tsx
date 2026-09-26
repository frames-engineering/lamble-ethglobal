import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

interface SectionProps {
  id: string;
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Right-hand slot in the header row (controls, live widgets). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Let the content escape the container (used by the full-bleed table on phones). */
  bleed?: boolean;
}

export function Section({ id, eyebrow, title, description, aside, children, className, bleed }: SectionProps) {
  const hasHeader = eyebrow || title || description || aside;
  return (
    <section id={id} className={cn("scroll-mt-24 py-5 md:py-7", className)}>
      <Container>
        {hasHeader && (
          <div className="mb-4 flex flex-col gap-6 md:mb-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              {eyebrow && (
                <p className="mb-3 text-2xs font-medium uppercase tracking-widest text-med">{eyebrow}</p>
              )}
              {title && (
                <h2 className="text-base font-bold leading-tight tracking-tight text-high">{title}</h2>
              )}
              {description && <p className="mt-3 text-sm leading-relaxed text-med md:text-base">{description}</p>}
            </div>
            {aside && <div className="shrink-0 md:max-w-md md:flex-1">{aside}</div>}
          </div>
        )}
      </Container>
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}
