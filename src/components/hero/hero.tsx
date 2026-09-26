"use client";

import { HeroVisual } from "@/components/hero/hero-visual";
import { OnboardAgentButton } from "@/components/hero/onboard-agent-button";
import { StatTiles } from "@/components/hero/stat-tiles";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { useEntered } from "@/hooks/use-entered";
import type { Aggregates } from "@/lib/data/aggregate";

/** Full-bleed video hero: glass panels float over the composition, title top-left and stats along the bottom. */
export function Hero({ stats }: { stats: Aggregates }) {
  // Flips two frames after hydration and starts the panels' entrance (see .hero-enter).
  const entered = useEntered();
  return (
    <section id="about" className="relative scroll-mt-24">
      <HeroVisual className="absolute inset-0" />
      {/* pointer-events-none so hovering the video reaches the canvas (pixel trail); the panels opt back in.
          From xl the card shares the navbar's top offset and each takes at most half the width, card left, bar right. */}
      <Container
        data-entered={entered ? "" : undefined}
        className="pointer-events-none relative flex min-h-svh flex-col justify-between gap-10 pt-24 pb-6 md:pt-28 md:pb-8 lg:max-w-none xl:pt-4"
      >
        <div className="glass hero-enter pointer-events-auto max-w-2xl p-5 [--enter-delay:80ms] md:p-6 xl:max-w-[min(42rem,calc(50%-0.75rem))]">
            <h1 className="text-2xl leading-[1.1] font-semibold tracking-tight text-balance text-high md:text-4xl">
              Route your token launch to the launchpad with highest odds of success.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-med md:text-lg">
              Intelligence for optimizing your launch before it hits the market.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button type="button" size="lg">
                Launch Token
              </Button>
              <OnboardAgentButton />
            </div>
        </div>
        <StatTiles stats={stats} className="pointer-events-auto" />
      </Container>
    </section>
  );
}
