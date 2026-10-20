import { ogCard } from "@/components/research/og-card";
import { formatValue } from "@/components/research/measure";
import { formatDate } from "@/components/research/time";
import { isWeekId } from "@/lib/lamble/core/time";
import { editionIndex, getEdition } from "@/lib/lamble/service";

export const alt = "State of the Trenches weekly edition";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  if (!isWeekId(week) || !editionIndex().some((e) => e.id === week)) return ogCard({ eyebrow: "Weekly edition", title: "Edition not found", stats: [], footer: "" });
  const e = getEdition(week);
  return ogCard({
    eyebrow: "Weekly edition",
    title: e.title,
    stats: [
      { label: "Fee subtotal", value: formatValue(e.market.feeSubtotal.value, "usd") },
      { label: `vs ${e.comparison.id}`, value: formatValue(e.market.feeSubtotal.changePct, "signed-percent") },
      { label: "Narrative volume", value: formatValue(e.dedup.totalVolume, "usd") },
    ],
    footer: `${formatDate(e.interval.start)} – ${formatDate(Date.parse(e.interval.end) / 1000 - 1)} · ${e.status} · r${e.revision}`,
  });
}
