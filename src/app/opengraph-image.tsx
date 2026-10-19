import { ogCard } from "@/components/research/og-card";
import { formatValue } from "@/components/research/measure";
import { formatDate } from "@/components/research/time";
import { loadRelease } from "@/lib/lambo/service";

export const alt = "LAMBLE — trenches research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const { data } = loadRelease();
  const m = data.market;
  return ogCard({
    eyebrow: "Trenches research",
    title: "Coins, narratives and launchpads in the crypto trenches, with the evidence.",
    stats: [
      { label: "Fee subtotal, last day", value: formatValue(m.feeSubtotal.value, "usd") },
      { label: "Coins tracked", value: formatValue(m.tracked.coins, "count") },
      { label: "Narratives", value: formatValue(m.tracked.narratives, "count") },
    ],
    footer: `Data cutoff ${formatDate(data.dataCutoff)}`,
  });
}
