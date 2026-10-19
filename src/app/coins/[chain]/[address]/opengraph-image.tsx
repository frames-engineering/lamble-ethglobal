import { ogCard } from "@/components/research/og-card";
import { formatValue } from "@/components/research/measure";
import { formatDate } from "@/components/research/time";
import { CHAIN_NAME } from "@/lib/lambo/core/identity";
import { loadRelease, parseCoinRoute } from "@/lib/lambo/service";

export const alt = "LAMBLE coin research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ chain: string; address: string }> }) {
  const p = await params;
  const { data, coins } = loadRelease();
  let coin = null;
  try {
    coin = coins.get(parseCoinRoute(p.chain, p.address).id) ?? null;
  } catch {
    coin = null;
  }
  if (!coin) return ogCard({ eyebrow: "Coin research", title: "Coin not covered", stats: [], footer: `Release ${data.releaseId}` });
  return ogCard({
    eyebrow: `Coin · ${CHAIN_NAME[coin.chain]}`,
    title: `${coin.symbol ?? coin.address.slice(0, 8)}${coin.name && coin.name !== coin.symbol ? ` — ${coin.name}` : ""}`,
    stats: [
      { label: "Market cap (circulating)", value: formatValue(coin.market.marketCap.value, "usd") },
      { label: "Volume 24h", value: formatValue(coin.market.volume24hRolling.value, "usd") },
      { label: "Bottoming test", value: coin.bottoming.state === "evaluated" ? `Stage ${coin.bottoming.stage}/3` : coin.bottoming.state === "not_applicable" ? "Not applicable" : "Insufficient data" },
    ],
    footer: `Data cutoff ${formatDate(data.dataCutoff)}`,
  });
}
