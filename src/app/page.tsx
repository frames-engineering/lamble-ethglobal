import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ChainMark } from "@/components/brand/chain-mark";
import { LamboStrip } from "@/components/hero/lambo-strip";
import { Container } from "@/components/layout/container";
import { SectionTabs } from "@/components/layout/section-tabs";
import { overviewData } from "@/components/overview/data";
import { FeesChart } from "@/components/overview/fees-chart";
import { Change } from "@/components/overview/format";
import { NarrativeExplorer } from "@/components/overview/narrative-explorer";
import { TrenchIndexBlock } from "@/components/overview/trench-index";
import { TrendingTokens } from "@/components/overview/trending-tokens";
import { KeyFigure, KeyFigures } from "@/components/research/figures";
import { coinHref } from "@/components/research/links";
import { MoreLink, PageHeader, Section } from "@/components/research/panel";
import { formatDateTime } from "@/components/research/time";
import { buttonVariants } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import type { ChainId } from "@/lib/data/types";
import { compactUsd } from "@/lib/format";
import { getTrenchIndex, loadRelease } from "@/lib/lamble/service";

const SECTIONS = [
  ["overview", "Overview"],
  ["narratives", "Narratives"],
  ["launchpads", "Launchpads"],
  ["tokens", "Tokens"],
  ["research", "Research"],
] as const;

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const HOTTEST = "text-high underline-offset-4 decoration-med/50 hover:underline";

export default function OverviewPage() {
  const { data: release } = loadRelease();
  const { fees, stats, featured, tokens, research } = overviewData();
  const lastDay = fees.days[fees.days.length - 1];
  const trench = getTrenchIndex();

  return (
    <>
      <Container>
        {/* First load plays a short entrance down to the narratives (rise-0 … rise-5); everything below is static. */}
        <PageHeader
          enter
          title="The Trenches"
          description="What’s moving in the memecoin trenches: the narratives drawing volume, the tokens carrying them and the launchpads they come from. Refreshed daily; every figure is dated and sourced."
          aside={trench && <TrenchIndexBlock index={trench} />}
          actions={
            // How narratives are picked and volume is counted is the first question a trend list raises.
            <Link href="/methodology" className={buttonVariants({ variant: "outline" })}>
              Methodology
              <ArrowRightIcon aria-hidden className="size-3.5 text-med" />
            </Link>
          }
        />
        <p className="mt-4 text-xs text-med lg:hidden">Data through {formatDateTime(release.dataCutoff)}</p>

        <SectionTabs sections={SECTIONS} className="mt-8 rise-3" />

        <section id="overview" aria-label="Overview" className="pt-8 rise-4">
          <KeyFigures>
            <KeyFigure
              label={
                <>
                  Launchpad fees, {lastDay ? DAY.format(new Date(lastDay.time * 1000)) : "last day"}
                  <InfoTip label="What launchpad fees include">{fees.scope}</InfoTip>
                </>
              }
              sub={
                <>
                  <Change value={fees.change7dPct} /> last 7d vs prior 7d
                </>
              }
            >
              {compactUsd(fees.latest, 2)}
            </KeyFigure>
            <KeyFigure
              label="Narratives tracked"
              sub={
                stats.narratives.hottest && (
                  <span className="block truncate">
                    Hottest:{" "}
                    <Link href={stats.narratives.hottest.href} title={stats.narratives.hottest.title} className={HOTTEST}>
                      {stats.narratives.hottest.title}
                    </Link>
                  </span>
                )
              }
            >
              {String(stats.narratives.tracked)}
            </KeyFigure>
            <KeyFigure
              label="Launchpads tracked"
              sub={
                stats.launchpads.hottest && (
                  <span className="flex max-w-full min-w-0 items-center gap-1.5">
                    <span className="shrink-0">Hottest:</span>
                    {stats.launchpads.hottest.logo && (
                      <Image src={stats.launchpads.hottest.logo} alt="" width={14} height={14} unoptimized className="size-3.5 shrink-0 rounded-xs outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />
                    )}
                    <Link href={stats.launchpads.hottest.href} className={`min-w-0 truncate ${HOTTEST}`}>
                      {stats.launchpads.hottest.name}
                    </Link>
                  </span>
                )
              }
            >
              {String(stats.launchpads.tracked)}
            </KeyFigure>
            <KeyFigure
              label="Coins tracked"
              sub={
                stats.coins.hottest && (
                  <span className="flex max-w-full min-w-0 items-center gap-1.5">
                    <span className="shrink-0">Hottest:</span>
                    <ChainMark chain={stats.coins.hottest.chain as ChainId} size={13} />
                    <Link href={coinHref(stats.coins.hottest.chain, stats.coins.hottest.address)} className={`min-w-0 truncate ${HOTTEST}`}>
                      {stats.coins.hottest.symbol}
                    </Link>
                  </span>
                )
              }
            >
              {String(stats.coins.tracked)}
            </KeyFigure>
          </KeyFigures>
        </section>

        <Section
          id="narratives"
          title="Trending narratives"
          aside={<MoreLink href="/narratives">All narratives</MoreLink>}
          className="rise-5"
        >
          <NarrativeExplorer narratives={featured} />
        </Section>

        <Section
          id="launchpads"
          title="Launchpad fees"
          aside={<MoreLink href="/launchpads">All launchpads</MoreLink>}
        >
          <div className="rounded-sm border border-line p-4 md:p-5">
            <FeesChart series={fees.series} days={fees.days} />
          </div>
        </Section>

        <Section
          id="tokens"
          title="Trending tokens"
          description="Very high turnover against market cap can include wash or bot trading."
          aside={<MoreLink href="/coins">All coins</MoreLink>}
        >
          <TrendingTokens tokens={tokens} />
        </Section>

        <Section
          id="research"
          title="Latest research"
          aside={<MoreLink href="/research">All research</MoreLink>}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {research.map((a) => {
              // Daily notes are titled "Daily facts, Oct 27, 2026": the eyebrow already says the first half.
              const stripped = a.title.toLowerCase().startsWith(a.kind.toLowerCase()) ? a.title.slice(a.kind.length).replace(/^[\s,:–-]+/, "") : "";
              return (
                <li key={a.slug}>
                  <Link href={`/research/${a.slug}`} className="flex h-full flex-col rounded-lg bg-card p-5 transition-colors duration-150 hover:bg-surface-3">
                    <span className="text-2xs font-medium tracking-[0.08em] text-med uppercase">{a.kind}</span>
                    <span className="mt-2 text-base font-medium text-balance text-high">{stripped || a.title}</span>
                    {a.dek && <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-med">{a.dek}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      </Container>

      <footer className="mt-20">
        <Container>
          <div className="flex flex-col gap-2 border-t border-line pt-6 text-xs text-med sm:flex-row sm:items-center sm:justify-between">
            <p>LAMBLE publishes research on the crypto trenches, not investment advice.</p>
            <p>Data through {formatDateTime(release.dataCutoff)}</p>
          </div>
        </Container>
        <LamboStrip />
      </footer>
    </>
  );
}
