import { ogCard } from "@/components/research/og-card";
import { formatValue } from "@/components/research/measure";
import { TREND_LABEL } from "@/components/research/narrative-bits";
import { formatDate } from "@/components/research/time";
import { loadRelease } from "@/lib/lamble/service";

export const alt = "LAMBLE narrative research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data, narratives } = loadRelease();
  const n = narratives.get(slug);
  if (!n) return ogCard({ eyebrow: "Narrative", title: "Narrative not found", stats: [], footer: `Release ${data.releaseId}` });
  return ogCard({
    eyebrow: "Narrative",
    title: n.title,
    stats: [
      { label: "Volume, 7 days of data", value: formatValue(n.activity.volume7d.value, "usd") },
      { label: "Members", value: String(n.memberCounts.open) },
      { label: "Trend", value: TREND_LABEL[n.trend] },
    ],
    footer: `Data cutoff ${formatDate(data.dataCutoff)}`,
  });
}
