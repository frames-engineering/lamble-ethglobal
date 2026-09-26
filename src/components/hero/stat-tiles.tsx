import { ChainStack } from "@/components/brand/chain-mark";
import { Sparkline } from "@/components/charts/sparkline";
import { Delta } from "@/components/shared/delta";
import type { Aggregates } from "@/lib/data/aggregate";
import { compactNumber, compactUsd, int, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

function Tile({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass flex min-h-[124px] w-52 shrink-0 snap-start flex-col justify-between p-4 md:w-auto", className)}>
      <p className="text-sm font-medium text-med">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-medium tabular-nums text-high">{value}</p>
        {children}
      </div>
    </div>
  );
}

export function StatTiles({ stats, className }: { stats: Aggregates; className?: string }) {
  const gradRate = stats.launched24h > 0 ? (stats.graduated24h / stats.launched24h) * 100 : 0;
  // The sparkline is the 30d fee history, so its change and tone use the 30d window too.
  const feesUp = stats.feesChange30d >= 0;

  return (
    // Phones: one bleeding, snapping row that scrolls sideways. From md: a four-up grid.
    <div
      className={cn(
        "-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scroll-px-4 scrollbar-none md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0",
        className,
      )}
    >
      <Tile label="Launchpads tracked" value={int(stats.launchpadCount)} className="hero-enter [--enter-delay:200ms]">
        <div className="flex flex-col items-end gap-1.5">
          <ChainStack chains={stats.chains} max={5} size={16} />
          <span className="text-2xs text-med">{stats.chainCount} chains</span>
        </div>
      </Tile>
      <Tile label="Fees 24h · all launchpads" value={compactUsd(stats.fees24h)} className="hero-enter [--enter-delay:260ms]">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs">
            <Delta value={stats.feesChange30d} /> <span className="text-2xs text-med">30d</span>
          </span>
          <Sparkline
            points={stats.feesHistory30d}
            width={72}
            height={22}
            className={cn("h-[22px] w-[72px]", feesUp ? "text-positive" : "text-negative")}
            id="fees"
          />
        </div>
      </Tile>
      <Tile label="Tokens launched 24h" value={compactNumber(stats.launched24h)} className="hero-enter [--enter-delay:320ms]">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs tabular-nums text-high">{stats.launchesPerMinute.toFixed(1)}</span>
          <span className="text-2xs text-med">per minute</span>
        </div>
      </Tile>
      <Tile label="Graduated 24h" value={int(stats.graduated24h)} className="hero-enter [--enter-delay:380ms]">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs tabular-nums text-high">{percent(gradRate, { digits: 2 })}</span>
          <span className="text-2xs text-med">of launches</span>
        </div>
      </Tile>
    </div>
  );
}
