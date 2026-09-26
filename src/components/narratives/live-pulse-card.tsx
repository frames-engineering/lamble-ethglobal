"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { usePageVisible } from "@/hooks/use-page-visible";

const LivePulse = dynamic(() => import("@/components/charts/live-pulse").then((m) => m.LivePulse), {
  ssr: false,
  loading: () => <ChartSkeleton height={72} />,
});

export function LivePulseCard({ mean }: { mean: number }) {
  const visible = usePageVisible();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const paused = !visible || !onScreen || Boolean(reduce);

  return (
    <div ref={ref} className="rounded-xl bg-surface-1 p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="flex items-center gap-2 font-medium text-high">
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-positive" />
          </span>
          Live · launches per minute
        </p>
        <p className="text-med">all launchpads</p>
      </div>
      <div className="mt-2">
        <LivePulse mean={mean} paused={paused} height={72} />
      </div>
    </div>
  );
}
