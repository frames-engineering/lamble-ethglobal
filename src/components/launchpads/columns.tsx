import { ArrowUpRightIcon, FlameIcon, MoreVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ChainStack } from "@/components/brand/chain-mark";
import { LetterMark } from "@/components/brand/letter-mark";
import { Sparkline } from "@/components/charts/sparkline";
import { Delta } from "@/components/shared/delta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { chainInfo } from "@/lib/data/chains";
import type { Launchpad, Timeframe } from "@/lib/data/types";
import { compactNumber, compactUsd, int, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "h24", label: "24h" },
  { id: "d7", label: "7d" },
  { id: "d30", label: "30d" },
];
export const TF_LABEL: Record<Timeframe, string> = { h24: "24h", d7: "7d", d30: "30d" };

/** 7d fee change, percent, that earns the Trending badge. */
const TRENDING_BADGE_THRESHOLD = 25;

export type ColumnId =
  | "launchpad"
  | "chains"
  | "fees"
  | "revenue"
  | "launched"
  | "graduated"
  | "trend"
  | "actions";

export interface CellContext {
  tf: Timeframe;
  medianGradRate: number;
  onOpen: (slug: string) => void;
}

export interface Column {
  id: ColumnId;
  header: (ctx: CellContext) => string;
  hint?: string;
  align: "left" | "right";
  sortable: boolean;
  /** Order on phones, decided once at mount (design-system/components/table.md). */
  mobileRank: number;
  sortValue?: (row: Launchpad, ctx: CellContext) => number | string;
  cell: (row: Launchpad, ctx: CellContext) => ReactNode;
  className?: string;
}

export function hasCurve(row: Launchpad): boolean {
  return row.feeModel.graduationTargetUsd > 0;
}

function Stack({
  primary,
  secondary,
  align = "right",
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", align === "right" ? "items-end" : "items-start")}>
      <span className="text-high">{primary}</span>
      {secondary !== undefined && <span className="text-2xs text-med">{secondary}</span>}
    </div>
  );
}

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
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
      <div className="flex items-center gap-3 py-1">
        <LetterMark name={row.name} color={row.brandColor} size={34} src={row.logoSrc} />
        <div className="min-w-0 max-w-[168px]">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap text-link">{row.name}</span>
            {row.metrics.d7.change >= TRENDING_BADGE_THRESHOLD && (
              <Badge variant="positive" className="h-[18px] gap-1 px-1.5 text-2xs">
                <FlameIcon />
                Trending
              </Badge>
            )}
          </div>
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            className="block truncate text-xs text-med transition-colors hover:text-link"
          >
            {row.domain}
          </a>
        </div>
      </div>
    ),
  },
  {
    id: "chains",
    header: () => "Chains",
    align: "left",
    sortable: true,
    mobileRank: 4,
    sortValue: (row) => row.chains.length,
    cell: (row) => (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-help" />}>
          <ChainStack chains={row.chains} max={4} size={16} />
        </TooltipTrigger>
        <TooltipContent>{row.chains.map((c) => chainInfo(c).name).join(" · ")}</TooltipContent>
      </Tooltip>
    ),
  },
  {
    id: "fees",
    header: (ctx) => `Fees ${TF_LABEL[ctx.tf]}`,
    hint: "Fees paid by traders and launchers on the venue. Where the flow is.",
    align: "right",
    sortable: true,
    mobileRank: 1,
    sortValue: (row, ctx) => row.metrics[ctx.tf].fees,
    cell: (row, ctx) => {
      const m = row.metrics[ctx.tf];
      return <Stack primary={compactUsd(m.fees)} secondary={<Delta value={m.change} />} />;
    },
  },
  {
    id: "revenue",
    header: (ctx) => `Revenue ${TF_LABEL[ctx.tf]}`,
    hint: "The share of fees the venue keeps. The rest goes to creators, buybacks or liquidity.",
    align: "right",
    sortable: true,
    mobileRank: 5,
    sortValue: (row, ctx) => row.metrics[ctx.tf].revenue,
    cell: (row, ctx) => {
      const m = row.metrics[ctx.tf];
      const take = m.fees > 0 ? (m.revenue / m.fees) * 100 : 0;
      return <Stack primary={compactUsd(m.revenue)} secondary={`${percent(Math.min(100, take), { digits: 0 })} of fees`} />;
    },
  },
  {
    id: "launched",
    header: () => "Launched 24h",
    hint: "New tokens created in the last 24 hours. High numbers mean reach, but also competition.",
    align: "right",
    sortable: true,
    mobileRank: 3,
    sortValue: (row) => row.metrics.launched24h,
    cell: (row) => (
      <Stack
        primary={int(row.metrics.launched24h)}
        secondary={`7d avg ${compactNumber(row.metrics.launched7dAvg)}`}
      />
    ),
  },
  {
    id: "graduated",
    header: () => "Graduated 24h",
    hint: "Tokens that completed the bonding curve and moved to a DEX. Rate is graduations over launches, 7 days.",
    align: "right",
    sortable: true,
    mobileRank: 2,
    sortValue: (row) => (hasCurve(row) ? row.metrics.graduationRate7d : -1),
    cell: (row, ctx) => {
      if (!hasCurve(row)) return <Stack primary="—" secondary="no curve" />;
      const rate = row.metrics.graduationRate7d;
      return (
        <Stack
          primary={int(row.metrics.graduated24h)}
          secondary={
            <span className={rate >= ctx.medianGradRate ? "text-positive" : undefined}>
              {percent(rate)} grad rate
            </span>
          }
        />
      );
    },
  },
  {
    id: "trend",
    header: () => "30d trend",
    align: "right",
    sortable: true,
    mobileRank: 6,
    sortValue: (row) => row.metrics.d30.change,
    cell: (row) => {
      const up = row.metrics.d30.change >= 0;
      return (
        <div className="flex justify-end">
          <Sparkline
            points={row.metrics.history30d}
            width={80}
            height={26}
            className={cn("h-[26px] w-20", up ? "text-positive" : "text-negative")}
            id={row.slug}
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => "",
    align: "right",
    sortable: false,
    mobileRank: 7,
    cell: (row, ctx) => (
      <div className="flex items-center justify-end gap-2" onClick={stop} onKeyDown={stop}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="ghost" size="icon" aria-label={`More actions for ${row.name}`} />}
          >
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => ctx.onOpen(row.slug)}>Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<a href={row.url} target="_blank" rel="noopener noreferrer" />}>
              Website
              <ArrowUpRightIcon className="ml-auto size-4" />
            </DropdownMenuItem>
            {row.twitter && (
              <DropdownMenuItem
                render={<a href={`https://x.com/${row.twitter}`} target="_blank" rel="noopener noreferrer" />}
              >
                X profile
                <ArrowUpRightIcon className="ml-auto size-4" />
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];
