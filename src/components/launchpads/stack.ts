/**
 * Shared shape for the stacked launchpad charts (overview fees, launchpads route history): which venues get a
 * series of their own, which color each one wears, and one row per day.
 */
import { SERIES, launchpadColors, launchpadRank } from "@/components/research/colors";

export interface StackSeries {
  id: string;
  label: string;
  /** CSS color: the launchpad's brand hue (research/colors), or SERIES.others for the folded rest. */
  color: string;
}

export interface StackDay {
  /** UTC day start, seconds. */
  time: number;
  total: number | null;
  /** Per series, in StackSeries order. Null on a day with no observation at all. */
  parts: (number | null)[];
}

interface Venue {
  slug: string;
  name: string;
}

/**
 * The `own` heaviest venues get a series each and the rest fold into "others". Each wears its brand color
 * (launchpadColors resolves clashes, largest first) and sits in brand stack order, so the big venues stay at
 * the base from chart to chart.
 */
export function stackSeries<T extends Venue>(venues: T[], weight: (v: T) => number, own: number) {
  const ranked = [...venues].sort((a, b) => weight(b) - weight(a));
  const mine = ranked.slice(0, own);
  const rest = ranked.slice(own);
  const colors = launchpadColors(mine.map((v) => v.slug));
  const placed = mine
    .map((venue, i) => ({ venue, color: colors[i] ?? SERIES.others }))
    .sort((a, b) => launchpadRank(a.venue.slug) - launchpadRank(b.venue.slug));
  const series: StackSeries[] = [
    ...placed.map(({ venue, color }) => ({ id: venue.slug, label: venue.name, color })),
    ...(rest.length ? [{ id: "others", label: `${rest.length} others`, color: SERIES.others }] : []),
  ];
  return { placed, rest, series, top: ranked[0] ?? null };
}

/**
 * One row per UTC day from `start` to `end` inclusive (seconds). A venue with no value on a day others report
 * counts as 0 (it hadn't launched, or had no activity); a day nobody reports is null throughout.
 */
export function stackDays<T extends Venue>(
  { placed, rest }: { placed: { venue: T }[]; rest: T[] },
  daily: (v: T) => Map<number, number>,
  start: number,
  end: number,
): StackDay[] {
  const own = placed.map((p) => daily(p.venue));
  const others = rest.map(daily);
  const days: StackDay[] = [];
  for (let t = start; t <= end; t += 86_400) {
    const reported = [...own, ...others].some((m) => m.has(t));
    if (!reported) {
      days.push({ time: t, total: null, parts: [...own.map(() => null), ...(rest.length ? [null] : [])] });
      continue;
    }
    const parts = [...own.map((m) => m.get(t) ?? 0), ...(rest.length ? [others.reduce((a, m) => a + (m.get(t) ?? 0), 0)] : [])];
    days.push({ time: t, total: parts.reduce((a, v) => a + v, 0), parts });
  }
  return days;
}
