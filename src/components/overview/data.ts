import { type StackSeries, stackSeries } from "@/components/launchpads/stack";
import { FORMAT_LABEL } from "@/components/research/article-bits";
import { shownChange } from "@/components/research/narrative-bits";
import type { CoinPublic, LaunchpadPublic } from "@/lib/lamble/release/types";
import { listArticles, loadRelease } from "@/lib/lamble/service";

/**
 * Read-only view of the published release for the overview: figures already in the release, picked and
 * reshaped. Nothing is recomputed beyond sums, shares of a total, sorts and ages at the cutoff.
 */

const OWN_SERIES = 5;
/** Tokens named in a narrative's breakdown; the rest fold into "others". */
const NAMED_TOKENS = 4;

export type FeeSeries = StackSeries;

export interface FeeDay {
  time: number;
  total: number | null;
  /** Per series, in FeeSeries order. */
  parts: number[];
}

export type OverviewData = ReturnType<typeof overviewData>;
export type FeaturedNarrative = OverviewData["featured"][number];
export type TrendingToken = OverviewData["tokens"][number];

const sum30 = (l: LaunchpadPublic) => l.metrics.history30d.reduce((a, p) => a + (p.value ?? 0), 0);

export function overviewData() {
  const { data } = loadRelease();
  const m = data.market;
  const cutoff = Date.parse(data.dataCutoff);
  const coinById = new Map(data.coins.map((c) => [c.id, c]));
  const ageDays = (c: CoinPublic | undefined) => {
    const t = c?.identity.tokenCreatedAt ?? c?.identity.firstObservedAt;
    return t ? (cutoff - Date.parse(t)) / 86_400_000 : null;
  };

  // Launchpad fees, daily: the non-overlapping streams that make up the fee subtotal, the top five by 30-day fees on their own.
  const included = data.launchpads.filter((l) => l.feeSubtotal.included);
  const { placed, rest, series, top } = stackSeries(included, sum30, OWN_SERIES);
  const days: FeeDay[] = m.feeSubtotal.history30d.map((p, i) => ({
    time: p.time,
    total: p.value,
    parts: [
      ...placed.map(({ venue }) => venue.metrics.history30d[i]?.value ?? 0),
      ...(rest.length ? [rest.reduce((a, l) => a + (l.metrics.history30d[i]?.value ?? 0), 0)] : []),
    ],
  }));
  // Share of the last settled day taken by the 30-day leader, for the section's one-line read.
  const lastDay = days[days.length - 1];
  const topIndex = placed.findIndex((p) => p.venue === top);
  const leader = top && topIndex >= 0 && lastDay?.total ? { name: top.name, share: (lastDay.parts[topIndex] ?? 0) / lastDay.total } : null;

  // Featured narratives, each with the tokens carrying its last 24 hours.
  const featured = data.narratives
    .filter((n) => n.featured.featured)
    .sort((a, b) => (a.featured.rank ?? 99) - (b.featured.rank ?? 99))
    .map((n) => {
      const live = n.members.filter((mem) => mem.collection === "collected" && (mem.volume24h ?? 0) > 0).sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
      const total24 = live.reduce((a, mem) => a + (mem.volume24h ?? 0), 0);
      const share = (v: number | null) => (total24 ? (v ?? 0) / total24 : 0);
      return {
        slug: n.slug,
        title: n.title,
        trend: n.trend,
        coins: n.memberCounts.open,
        since: n.firstObservedAt,
        volume7d: n.activity.volume7d.value,
        volume24h: n.activity.volume24h.value,
        change7d: shownChange(n),
        daily: n.activity.daily,
        hourly: n.activity.hourly,
        why: n.story?.interpretation ?? n.story?.notice ?? null,
        whyAt: n.story?.observedAt ?? null,
        tokens: live.slice(0, NAMED_TOKENS).map((mem) => {
          const c = coinById.get(mem.tokenId);
          return {
            id: mem.tokenId,
            chain: mem.chain,
            address: c?.address ?? "",
            symbol: mem.symbol,
            name: mem.name,
            share: share(mem.volume24h),
            change24h: c?.market.priceChange24hRolling.value ?? null,
            ageDays: ageDays(c),
          };
        }),
        others: { count: Math.max(0, live.length - NAMED_TOKENS), share: live.slice(NAMED_TOKENS).reduce((a, mem) => a + share(mem.volume24h), 0) },
      };
    });

  // Every collected token, with the narrative it trades under (a featured one first) and its age.
  const featuredSlugs = new Set(featured.map((n) => n.slug));
  const tokens = data.coins
    .filter((c) => c.collection.status === "collected" && c.market.volume24hRolling.value !== null)
    .map((c) => {
      const open = c.memberships.filter((mem) => mem.effectiveTo === null);
      const home = open.find((mem) => featuredSlugs.has(mem.narrativeSlug)) ?? open[0] ?? null;
      return {
        id: c.id,
        chain: c.chain,
        address: c.address,
        symbol: c.symbol,
        name: c.name,
        volume24h: c.market.volume24hRolling.value,
        change24h: c.market.priceChange24hRolling.value,
        ageDays: ageDays(c),
        narrative: home ? { slug: home.narrativeSlug, title: home.narrativeTitle } : null,
        volumeDaily: c.charts.volumeDaily,
      };
    });
  const mostTraded = [...tokens].sort((a, b) => (b.volume24h ?? -1) - (a.volume24h ?? -1))[0] ?? null;

  const hottestNarrative = data.narratives.filter((n) => n.lifecycle.state === "collected").sort((a, b) => (b.activity.volume7d.value ?? -1) - (a.activity.volume7d.value ?? -1))[0] ?? null;
  const hottestLaunchpad = [...data.launchpads].sort((a, b) => (b.metrics.h24.fees ?? -1) - (a.metrics.h24.fees ?? -1))[0] ?? null;

  const research = listArticles()
    .slice(0, 4)
    .map((a) => ({ slug: a.slug, title: a.title, dek: a.dek, kind: FORMAT_LABEL[a.format] }));

  return {
    fees: {
      latest: m.feeSubtotal.value,
      change7dPct: m.feeSubtotal.change7dPct,
      scope: m.feeSubtotal.scope,
      venues: included.length,
      leader,
      series,
      days,
    },
    stats: {
      narratives: { tracked: m.tracked.narratives, hottest: hottestNarrative ? { title: hottestNarrative.title, href: `/narratives/${hottestNarrative.slug}` } : null },
      launchpads: {
        tracked: data.launchpads.length,
        hottest: hottestLaunchpad
          ? {
              name: hottestLaunchpad.name,
              href: `/launchpads/${hottestLaunchpad.slug}`,
              logo: typeof hottestLaunchpad.presentation.logoSrc === "string" ? hottestLaunchpad.presentation.logoSrc : null,
            }
          : null,
      },
      coins: { tracked: m.tracked.coins, hottest: mostTraded },
    },
    featured,
    tokens,
    research,
  };
}
