"use client";

import Link from "next/link";

import { HeroVisual } from "@/components/hero/hero-visual";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { useEntered } from "@/hooks/use-entered";

export interface HeroStat {
  label: string;
  value: string;
  sub: string;
}

/** Research home hero: the same video composition and glass panels as the launch page, with release figures. */
export function ResearchHero({ stats, edition }: { stats: HeroStat[]; edition: { id: string; href: string } | null }) {
  const entered = useEntered();
  return (
    <section className="relative">
      <HeroVisual className="absolute inset-0" />
      <Container data-entered={entered ? "" : undefined} className="pointer-events-none relative flex min-h-[78svh] flex-col justify-between gap-8 pt-24 pb-6 md:pt-28 md:pb-8 lg:max-w-none">
        <div className="glass hero-enter pointer-events-auto max-w-2xl p-5 [--enter-delay:80ms] md:p-6">
          <p className="text-2xs font-medium tracking-widest text-med uppercase">Trenches research</p>
          <h1 className="mt-2 text-2xl leading-[1.1] font-semibold tracking-tight text-balance text-high md:text-4xl">What is moving in the trenches, and what the evidence says about it.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-med">
            Coin pages with holder analysis and a bottoming test, narratives with their full history, launchpad economics and a weekly State of the Trenches. Every figure is dated and sourced; missing data is labelled, never zero.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/coins" />}>
              Explore coins
            </Button>
            {edition && (
              <Button size="lg" variant="secondary" nativeButton={false} render={<Link href={edition.href} />}>
                {edition.id} edition
              </Button>
            )}
            <Button size="lg" variant="ghost" nativeButton={false} render={<Link href="/api" />}>
              API for agents
            </Button>
          </div>
        </div>
        <dl className="pointer-events-auto grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className="glass hero-enter flex min-h-[112px] flex-col justify-between p-4" style={{ ["--enter-delay" as string]: `${160 + i * 60}ms` }}>
              <dt className="text-sm font-medium text-med">{s.label}</dt>
              <dd className="mt-3">
                <span className="block text-2xl font-medium text-high tabular-nums">{s.value}</span>
                <span className="mt-1 block text-2xs text-med">{s.sub}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
