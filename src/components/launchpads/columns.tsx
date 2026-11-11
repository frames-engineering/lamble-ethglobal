import type { ReactNode } from "react";

import { ChainStack } from "@/components/brand/chain-mark";
import { LetterMark } from "@/components/brand/letter-mark";
import { Sparkline } from "@/components/charts/sparkline";
import { Change, money } from "@/components/overview/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { chainInfo } from "@/lib/data/chains";
import type { Launchpad, Timeframe } from "@/lib/data/types";
import { int, percent } from "@/lib/format";

export const TIMEFRAMES = [
  ["h24", "24h"],
  ["d7", "7d"],
  ["d30", "30d"],
] as const satisfies readonly (readonly [Timeframe, string])[];
export const TF_LABEL: Record<Timeframe, string> = { h24: "24h", d7: "7d", d30: "30d" };

export type ColumnId = "launchpad" | "fees" | "change" | "revenue" | "creators" | "launched" | "graduated" | "trend";

export interface CellContext {
  tf: Timeframe;
  /** Largest fee figure in the timeframe, across every venue: the scale for the bars behind the fee column. */
  maxFees: number;
}

export interface Column {
  id: ColumnId;
  header: (ctx: CellContext) => string;
  /** Scope note shown in an InfoTip beside the header. */
  hint?: string;
  align: "left" | "right";
  sortable: boolean;
  /** Order on phones, decided once at mount. */
  mobileRank: number;
  sortValue?: (row: Launchpad, ctx: CellContext) => number | string | null;
  cell: (row: Launchpad, ctx: CellContext) => ReactNode;
  className?: string;
}

export function hasCurve(row: Launchpad): boolean | null {
  return row.hasBondingCurve ?? null;
}

const FIGURE = "font-mono text-[13px]";

/** A figure with a smaller muted ratio after it (share of fees, completion rate), on one line. */
function WithRatio({ value, ratio }: { value: ReactNode; ratio: string }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-2">
      <span className={FIGURE}>{value}</span>
      <span className="w-10 text-right font-mono text-xs text-med">{ratio}</span>
    </span>
  );
}

/** Indexed counts are Codex beta observations, marked ≈ so they never read as complete event counts. */
function Indexed({ value }: { value: number }) {
  return (
    <>
      <span className="text-med">≈</span> {int(value)}
    </>
  );
}

export const COLUMNS: Column[] = [
  {
    id: "launchpad",
    header: () => "Launchpad",
    align: "left",
    sortable: true,
    mobileRank: 0,
    sortValue: (row) => row.name.toLowerCase(),
    className: "min-w-[200px]",
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <LetterMark name={row.name} color={row.brandColor} size={24} src={row.logoSrc} />
        <span className="font-medium whitespace-nowrap text-high">{row.name}</span>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex cursor-help" />}>
            {row.chains.length ? (
              <ChainStack chains={row.chains} max={3} size={16} className="*:data-[slot=avatar]:ring-background" />
            ) : (
              <span className="text-xs text-med">chains unverified</span>
            )}
          </TooltipTrigger>
          <TooltipContent>{row.chains.map((c) => chainInfo(c).name).join(" · ") || "Supported chains not verified; see financial coverage in details"}</TooltipContent>
        </Tooltip>
      </div>
    ),
  },
  {
    id: "fees",
    header: (ctx) => `Fees ${TF_LABEL[ctx.tf]}`,
    align: "right",
    sortable: true,
    mobileRank: 1,
    sortValue: (row, ctx) => row.metrics[ctx.tf].fees,
    cell: (row, ctx) => {
      const fees = row.metrics[ctx.tf].fees;
      return (
        <div className="relative ml-auto h-6 w-full max-w-36 sm:min-w-28">
          <span aria-hidden className="absolute inset-y-0 left-0 hidden bg-chart-bar sm:block" style={{ width: `${((fees ?? 0) / ctx.maxFees) * 100}%` }} />
          <span className={`${FIGURE} relative flex h-full items-center justify-end sm:pr-2`}>{money(fees)}</span>
        </div>
      );
    },
  },
  {
    id: "change",
    header: () => "vs prior",
    align: "right",
    sortable: true,
    mobileRank: 2,
    sortValue: (row, ctx) => row.metrics[ctx.tf].change,
    cell: (row, ctx) => (
      <span className={FIGURE}>
        <Change value={row.metrics[ctx.tf].change} />
      </span>
    ),
  },
  {
    id: "revenue",
    header: (ctx) => `Revenue ${TF_LABEL[ctx.tf]}`,
    hint: "Revenue under the source methodology; may include tokenholder flows. See details. The smaller figure is revenue as a share of fees.",
    align: "right",
    sortable: true,
    mobileRank: 5,
    sortValue: (row, ctx) => row.metrics[ctx.tf].revenue,
    cell: (row, ctx) => {
      const m = row.metrics[ctx.tf];
      const take = m.fees !== null && m.fees > 0 && m.revenue !== null ? (m.revenue / m.fees) * 100 : null;
      return <WithRatio value={money(m.revenue)} ratio={percent(take, { digits: 0 })} />;
    },
  },
  {
    id: "creators",
    header: (ctx) => `Creators ${TF_LABEL[ctx.tf]}`,
    hint: "Fees paid out to coin creators under the source methodology (DefiLlama supply-side revenue). Some venues also count holder, referrer or trader payouts; see details. The smaller figure is the share of fees.",
    align: "right",
    sortable: true,
    mobileRank: 6,
    sortValue: (row, ctx) => row.metrics[ctx.tf].supplySide ?? null,
    cell: (row, ctx) => {
      const m = row.metrics[ctx.tf];
      const share = m.fees !== null && m.fees > 0 && m.supplySide != null ? (m.supplySide / m.fees) * 100 : null;
      return <WithRatio value={money(m.supplySide ?? null)} ratio={percent(share, { digits: 0 })} />;
    },
  },
  {
    id: "launched",
    header: () => "Launched 24h",
    hint: "New tokens created in 24 hours. ≈ denotes Codex beta indexed observations; event completeness and exact cutoffs are not independently verified.",
    align: "right",
    sortable: true,
    mobileRank: 4,
    sortValue: (row) => row.metrics.launched24h ?? row.activityObservation?.indexedCreated24 ?? null,
    cell: (row) => (
      <span className={FIGURE}>
        {row.metrics.launched24h !== null ? int(row.metrics.launched24h) : row.activityObservation ? <Indexed value={row.activityObservation.indexedCreated24} /> : <span className="text-med">—</span>}
      </span>
    ),
  },
  {
    id: "graduated",
    header: () => "Graduated 24h",
    hint: "Bonding-curve completions, separate from migration. ≈ denotes Codex beta indexed observations. The smaller figure is completions over launches across 7 days: a period ratio, not the probability that a coin graduates. Sorts by that ratio.",
    align: "right",
    sortable: true,
    mobileRank: 3,
    sortValue: (row) => (hasCurve(row) === false ? null : row.metrics.graduationRate7d ?? row.activityObservation?.indexed7dCompletionRate ?? null),
    cell: (row) => {
      if (hasCurve(row) === false) return <span className="text-xs text-med">no curve</span>;
      const rate = row.metrics.graduationRate7d ?? row.activityObservation?.indexed7dCompletionRate ?? null;
      const count =
        row.metrics.graduated24h !== null ? int(row.metrics.graduated24h) : row.activityObservation?.indexedCompleted24 != null ? <Indexed value={row.activityObservation.indexedCompleted24} /> : <span className="text-med">—</span>;
      return <WithRatio value={count} ratio={percent(rate)} />;
    },
  },
  {
    id: "trend",
    header: () => "30d trend",
    align: "right",
    sortable: true,
    mobileRank: 7,
    sortValue: (row) => row.metrics.d30.change,
    cell: (row) => (
      <div className="flex justify-end">
        <Sparkline id={`lp-${row.slug}`} points={row.metrics.history30d} width={80} height={20} fill={false} strokeWidth={1.25} className="text-med" />
      </div>
    ),
  },
];
