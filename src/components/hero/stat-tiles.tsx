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
  title,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div title={title} className={cn("glass flex min-h-[124px] w-52 shrink-0 snap-start flex-col justify-between p-4 md:w-auto", className)}>
      <p className="text-sm font-medium text-med">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-medium tabular-nums text-high">{value}</p>
        {children}
      </div>
    </div>
  );
}

export function StatTiles({ stats, className }: { stats: Aggregates; className?: string }) {
  const gradRate = stats.indexedCompletionRate;
  // The sparkline is the 30d fee history, so its change and tone use the 30d window too.
  const feesUp = stats.feesChange30d !== null && stats.feesChange30d >= 0;

  return (
    // Phones: one bleeding, snapping row that scrolls sideways. From md: a four-up grid.
    <div
      className={cn(
        "-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scroll-px-4 scrollbar-none md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0",
        className,
      )}
    >
      <Tile label="Launchpads tracked" value={int(stats.launchpadCount)} className="hero-enter [--enter-delay:240ms]">
        <div className="flex flex-col items-end gap-1.5">
          <ChainStack chains={stats.chains} max={5} size={16} />
          <span className="text-2xs text-med">{stats.chainCount} chains</span>
        </div>
      </Tile>
      <Tile label="Fees 24h · covered venues" value={compactUsd(stats.feeSubtotal)} title={stats.feeScope} className="hero-enter [--enter-delay:300ms]">
        <div className="flex flex-col items-end gap-1">
          {stats.feesChange30d !== null && <span className="text-xs">
            <Delta value={stats.feesChange30d} /> <span className="text-2xs text-med">30d</span>
          </span>}
          <Sparkline
            points={stats.feesHistory30d}
            width={72}
            height={22}
            className={cn("h-[22px] w-[72px]", stats.feesChange30d === null ? "text-med" : feesUp ? "text-positive" : "text-negative")}
            id="fees"
          />
        </div>
      </Tile>
      <Tile label="Indexed launches 24h" value={compactNumber(stats.indexedCreated24)} title={`Codex beta observations across ${stats.creationCoverage} covered venues. Exact event completeness and window cutoff are not independently verified.`} className="hero-enter [--enter-delay:360ms]">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs tabular-nums text-high">{stats.indexedCreated24 === null ? '—' : (stats.indexedCreated24 / 1440).toFixed(1)}</span>
          <span className="text-2xs text-med">per minute</span>
        </div>
      </Tile>
      <Tile label="Indexed completions 24h" value={int(stats.indexedCompleted24)} title={`Codex beta curve-completion observations across ${stats.completionCoverage} venues. The ratio uses launches from those same venues. Migration is separate; conflicting Argus observations are excluded.`} className="hero-enter [--enter-delay:420ms]">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs tabular-nums text-high">{percent(gradRate, { digits: 2 })}</span>
          <span className="text-2xs text-med">of covered launches</span>
        </div>
      </Tile>
    </div>
  );
}
