import { TrenchGauge } from "@/components/overview/trench-gauge";
import { InfoTip } from "@/components/ui/info-tip";
import { TRENCH_BANDS, type TrenchIndex, WEIGHTS } from "@/lib/lamble/methods/trench-index";

const pct = (w: number) => `${Math.round(w * 100)}%`;

/** 1st, 2nd, 3rd, 11th, 81st. */
function ordinal(v: number): string {
  const n = Math.round(v);
  const tail = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${tail}`;
}

/**
 * The trench index for the overview header: how busy the trenches are against their own past, as a gauge. It
 * answers the first question of a daily visit (is it hot or frozen today?) before the narratives say where the
 * heat is. The three parts, their weights and today's scores sit under the ⓘ.
 */
export function TrenchIndexBlock({ index }: { index: TrenchIndex }) {
  const { fees, breadth, launches } = index;

  return (
    <div className="flex w-full flex-col items-center md:w-56">
      {/* No date here: the top bar already shows the release's data cutoff. */}
      <p className="mb-4 flex items-center gap-1.5 text-xs text-med">
        Trench index
        <InfoTip label="How the trench index is scored">
          <span className="block">How busy the trenches are against their own past: 0 is frozen, 100 is peak euphoria.</span>
          <span className="mt-2 block">
            Launchpad fees, 7d ({pct(WEIGHTS.fees)}): {fees.score}. The {ordinal(fees.pct90)} percentile of the last 90 days and the{" "}
            {ordinal(fees.pct365)} of the last year.
          </span>
          <span className="mt-1 block">
            Venue breadth ({pct(WEIGHTS.breadth)}): {breadth.score}. {breadth.above} of {breadth.venues} launchpads have 7-day fees at or above
            their own 90-day median.
          </span>
          <span className="mt-1 block">
            New launches, 24h ({pct(WEIGHTS.launches)}): {launches.score}. Percentile of the last {launches.windowDays} daily snapshots; launch
            counts start on Sep 28, so this window grows to 90 days.
          </span>
        </InfoTip>
      </p>
      <TrenchGauge
        score={index.score}
        band={index.band.label}
        bands={[...TRENCH_BANDS]}
        label={`Trench index ${index.score} of 100: ${index.band.label.toLowerCase()}`}
      />
    </div>
  );
}
