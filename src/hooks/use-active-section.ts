"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which section id is in the reading band of the viewport.
 * Falls back to the first id near the top of the page.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const visible = new Map<string, number>();
    const pick = () => {
      if (window.scrollY < 80) {
        setActive(ids[0] ?? null);
        return;
      }
      let best: string | null = null;
      let bestTop = Number.POSITIVE_INFINITY;
      for (const el of els) {
        if (!visible.has(el.id)) continue;
        const top = Math.abs(el.getBoundingClientRect().top);
        if (top < bestTop) {
          bestTop = top;
          best = el.id;
        }
      }
      if (best) setActive(best);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        }
        pick();
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.01, 0.25, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));
    window.addEventListener("scroll", pick, { passive: true });
    pick();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, [ids]);

  return active;
}
