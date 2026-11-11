import { stackDays, stackSeries } from "@/components/launchpads/stack";
import type { DailyValue } from "@/lib/lamble/methods/trench-index";
import { getLaunchpadHistory, launchSnapshots, loadRelease } from "@/lib/lamble/service";

/**
 * The launchpads route's history charts, reshaped from the service: daily fees and revenue for the fee-subtotal
 * launchpads over their whole history, and daily launch counts. Nothing is recomputed beyond sums.
 */

/** Venues with a series of their own: one per palette slot. */
const OWN_SERIES = 7;

const sum = (rows: DailyValue[]) => rows.reduce((a, r) => a + r.value, 0);
const byDay = (rows: DailyValue[]) => new Map(rows.map((r) => [r.day, r.value]));

export function launchpadHistory() {
  const history = getLaunchpadHistory();
  if (!history) return null;
  const { asOfDay, venues } = history;

  // Fees and revenue share one set of series, ranked by lifetime fees, so a venue keeps its place in both.
  const stack = stackSeries(venues, (v) => sum(v.fees), OWN_SERIES);
  const since = Math.min(...venues.flatMap((v) => (v.fees[0] ? [v.fees[0].day] : [])));

  // Launch counts cover every indexed venue, not only the fee subtotal: counts don't double up.
  const { launchpads } = loadRelease();
  const indexed = [...launchSnapshots()].map(([slug, rows]) => ({ slug, name: launchpads.get(slug)?.name ?? slug, rows }));
  const launchStack = stackSeries(indexed, (v) => sum(v.rows.slice(-7)), OWN_SERIES);
  const launchDays = indexed.flatMap((v) => v.rows.map((r) => r.day));

  return {
    venues: venues.length,
    since,
    fees: { series: stack.series, days: stackDays(stack, (v) => byDay(v.fees), since, asOfDay) },
    revenue: { series: stack.series, days: stackDays(stack, (v) => byDay(v.revenue), since, asOfDay) },
    launches: {
      series: launchStack.series,
      days: launchDays.length ? stackDays(launchStack, (v) => byDay(v.rows), Math.min(...launchDays), Math.max(...launchDays)) : [],
      since: launchDays.length ? Math.min(...launchDays) : null,
    },
  };
}
