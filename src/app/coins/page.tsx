import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { type CoinRow, CoinTable } from "@/components/research/coin-table";
import { formatValue } from "@/components/research/measure";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDateTime } from "@/components/research/time";
import { Input } from "@/components/ui/input";
import { CHAIN_NAME, type Chain } from "@/lib/lamble/core/identity";
import type { CoinPublic } from "@/lib/lamble/release/types";
import { type CoinFilters, filterCoins, holderCoverage, loadRelease } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Coins",
  description: "Every coin LAMBLE tracks: market snapshot, narrative membership, holder-analysis coverage and bottoming-test state, filterable by chain, narrative and collection status.",
  alternates: { canonical: "/coins" },
};

type Search = Record<string, string | string[] | undefined>;

const SORTS = { volume: "Volume 24h", liquidity: "Liquidity", marketCap: "Market cap", change7d: "7d change", age: "Newest", symbol: "Symbol" } as const;
const COLLECTION = { collected: "Collected daily", collection_paused: "Collection paused", inactive: "Inactive" } as const;
const BOTTOMING = { evaluated: "Evaluated", insufficient_data: "Insufficient data", not_applicable: "Not applicable" } as const;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length <= 100 ? s : undefined;
}

function pick<T extends Record<string, string>>(v: string | undefined, options: T): keyof T | undefined {
  return v !== undefined && Object.hasOwn(options, v) ? (v as keyof T) : undefined;
}

/** Search params are untrusted: every value is checked against a closed set or parsed as a bounded number. */
function parseFilters(sp: Search, chains: Set<string>, narratives: Set<string>): CoinFilters {
  const num = (v: string | undefined) => {
    const n = v === undefined || v === "" ? NaN : Number(v);
    return Number.isFinite(n) && n >= 0 && n < 1e15 ? n : undefined;
  };
  const chain = one(sp.chain);
  const narrative = one(sp.narrative);
  const order = one(sp.order);
  return {
    q: one(sp.q),
    chain: chain && chains.has(chain) ? chain : undefined,
    narrative: narrative && narratives.has(narrative) ? narrative : undefined,
    collection: pick(one(sp.collection), COLLECTION),
    bottoming: pick(one(sp.bottoming), BOTTOMING),
    minLiquidity: num(one(sp.minLiquidity)),
    maxAgeDays: num(one(sp.maxAgeDays)),
    minCoverage: num(one(sp.minCoverage)),
    sort: pick(one(sp.sort), SORTS) ?? "volume",
    order: order === "asc" || order === "desc" ? order : undefined,
  };
}

function row(c: CoinPublic): CoinRow {
  const m = c.market;
  const ch = m.change7d.value;
  const open = c.memberships.filter((x) => x.effectiveTo === null);
  return {
    id: c.id,
    href: `/coins/${c.chain}/${c.address}`,
    chain: c.chain,
    symbol: c.symbol ?? `${c.address.slice(0, 6)}…`,
    name: c.name,
    narratives: [...new Map(open.map((x) => [x.narrativeSlug, { slug: x.narrativeSlug, title: x.narrativeTitle }])).values()],
    price: m.price.value === null ? "—" : formatValue(m.price.value, "price"),
    volume24h: formatValue(m.volume24hRolling.value, "usd"),
    liquidity: formatValue(m.liquidity.value, "usd"),
    marketCap: formatValue(m.marketCap.value, "usd"),
    change7d: { text: ch === null ? "—" : formatValue(ch, "signed-percent"), sign: ch === null ? null : ch > 0 ? 1 : ch < 0 ? -1 : 0 },
    stale: m.price.state === "stale",
    holderCoverage: holderCoverage(c),
    bottoming: c.bottoming.state === "evaluated" ? `Stage ${c.bottoming.stage}` : BOTTOMING[c.bottoming.state],
    collection: COLLECTION[c.collection.status],
  };
}

const selectClass = "h-9 w-full rounded-lg border border-line bg-surface-3 px-2 text-sm text-high focus-visible:border-link focus-visible:outline-none";

export default async function CoinsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { data } = loadRelease();
  const chains = [...new Set(data.coins.map((c) => c.chain))].sort();
  const narratives = data.narratives.map((n) => ({ slug: n.slug, title: n.title })).sort((a, b) => a.title.localeCompare(b.title));
  const f = parseFilters(sp, new Set(chains), new Set(narratives.map((n) => n.slug)));
  const cutoff = Math.floor(Date.parse(data.dataCutoff) / 1000);
  const coins = filterCoins(data.coins, f, cutoff);
  const filtered = coins.length !== data.coins.length;

  return (
    <Container>
      <PageHeader
        eyebrow="Research"
        title="Coins"
        description={
          <p>
            {data.coins.length} coins tracked, {data.market.tracked.collected} collected in the latest daily run. A coin stays on record after collection stops; its last values are marked stale rather than removed. Missing values are shown as a dash, never as zero.
          </p>
        }
        meta={
          <>
            <span>Data cutoff {formatDateTime(data.dataCutoff)}</span>
            <span>
              Release <code className="font-mono">{data.releaseId}</code>
            </span>
          </>
        }
      />
      <div className="flex flex-col gap-4 pb-8">
        <Panel>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filter coins">
            <label className="flex flex-col gap-1 text-2xs text-med">
              Search
              <Input name="q" defaultValue={f.q ?? ""} placeholder="Symbol, name or address" />
            </label>
            <label className="flex flex-col gap-1 text-2xs text-med">
              Chain
              <select name="chain" defaultValue={f.chain ?? ""} className={selectClass}>
                <option value="">All chains</option>
                {chains.map((c) => (
                  <option key={c} value={c}>
                    {CHAIN_NAME[c as Chain] ?? c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-med">
              Narrative
              <select name="narrative" defaultValue={f.narrative ?? ""} className={selectClass}>
                <option value="">Any narrative</option>
                {narratives.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-med">
              Collection
              <select name="collection" defaultValue={f.collection ?? ""} className={selectClass}>
                <option value="">Any status</option>
                {Object.entries(COLLECTION).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-med">
              Bottoming test
              <select name="bottoming" defaultValue={f.bottoming ?? ""} className={selectClass}>
                <option value="">Any state</option>
                {Object.entries(BOTTOMING).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-med">
              Minimum liquidity (USD)
              <Input name="minLiquidity" type="number" min={0} step="any" defaultValue={f.minLiquidity ?? ""} />
            </label>
            <label className="flex flex-col gap-1 text-2xs text-med">
              Created within (days)
              <Input name="maxAgeDays" type="number" min={0} step={1} defaultValue={f.maxAgeDays ?? ""} />
            </label>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <label className="flex flex-col gap-1 text-2xs text-med">
                Sort
                <select name="sort" defaultValue={f.sort} className={selectClass}>
                  {Object.entries(SORTS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none">
                Apply
              </button>
            </div>
          </form>
          {filtered && (
            <p className="mt-3 text-xs text-med">
              {coins.length} of {data.coins.length} coins match.{" "}
              <Link href="/coins" className="text-link hover:underline">
                Clear filters
              </Link>
            </p>
          )}
        </Panel>
        <Panel>
          <CoinTable rows={coins.map(row)} />
        </Panel>
        <Note>
          Price, market cap and liquidity are the latest Codex snapshot; market cap is circulating, not fully diluted. Rolling 24h volume is as reported across all pools. The 7-day change compares snapshot prices about seven days apart and is missing when no such pair exists. Holders counts the holder-analysis components with a value, out of nine.
        </Note>
      </div>
    </Container>
  );
}
