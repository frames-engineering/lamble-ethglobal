"use client";

import { useEffect, useRef, useState } from "react";

import { HeroVisual } from "@/components/hero/hero-visual";

/**
 * The moving lambo, demoted from hero to the overview's footer. The WebGPU runtime and the video only load
 * once the footer comes within a screen of the viewport, so the page above never pays for it; reduced motion
 * skips it. Tall enough to read as the car, faded in from the page at the top.
 */
export function LamboStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="relative h-[24rem] motion-reduce:hidden [mask-image:linear-gradient(to_bottom,transparent,#000_22%)] md:h-[38rem]">
      {near && <HeroVisual className="absolute inset-0" />}
    </div>
  );
}
