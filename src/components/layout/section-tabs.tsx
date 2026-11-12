"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The overview's tab row, as in-page anchors: the page is long and mixes five kinds of content, so the row
 * stays in reach and the current section follows the scroll.
 */
export function SectionTabs({ sections, className }: { sections: readonly (readonly [id: string, label: string])[]; className?: string }) {
  const [active, setActive] = useState(sections[0]?.[0] ?? "");
  const list = useRef<HTMLUListElement>(null);

  // On phones the row scrolls sideways: keep the current tab in view. Scrolls the row only, never the page.
  useEffect(() => {
    const row = list.current;
    const tab = row?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!row || !tab) return;
    const left = tab.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + tab.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: Math.max(0, left - 24), behavior: "smooth" });
    }
  }, [active]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = sections[0]?.[0] ?? "";
      for (const [id] of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) current = id;
      }
      // At the very bottom the last section can't reach the top, so it wins outright.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections.at(-1)?.[0] ?? current;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  return (
    // Sticky against the page column: render it as a direct child of the Container, never inside a wrapper
    // that ends with it, or there is nowhere to stick. Its rule spans the content column, like the sections
    // under it, never the gutters.
    <nav aria-label="On this page" data-section-tabs className={cn("sticky top-14 z-20 border-b border-line bg-background lg:top-0", className)}>
      <ul ref={list} className="relative flex h-12 items-stretch gap-6 overflow-x-auto overscroll-x-contain scrollbar-none">
        {sections.map(([id, label]) => (
          <li key={id} className="flex">
            <a
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              className={cn("relative flex items-center text-sm whitespace-nowrap transition-colors duration-150", active === id ? "text-high" : "text-med hover:text-high")}
            >
              {label}
              {active === id && <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-high" />}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
