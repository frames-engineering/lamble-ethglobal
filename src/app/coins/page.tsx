import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { type CoinRow, CoinTable } from "@/components/research/coin-table";
import { formatValue } from "@/components/research/measure";
import { PageHeader, Panel } from "@/components/research/panel";
import { formatDateTime } from "@/components/research/time";
import { Button } from "@/components/ui/button";
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

// 16px on phones so iOS does not zoom into the field; 14px from md up, matching Input.
const selectClass = "h-9 w-full rounded-lg border border-line bg-background px-2 text-base text-high focus-visible:border-med focus-visible:outline-none md:text-sm";
const labelClass = "flex min-w-0 flex-col gap-1.5 text-xs text-med";

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
      <PageHeader title="Coins" description={`${data.coins.length} coins tracked, ${data.market.tracked.collected} collected in the latest daily run.`} />
      {/* The top bar carries the cutoff on desktop. */}
      <p className="mt-4 text-xs text-med lg:hidden">Data through {formatDateTime(data.dataCutoff)}</p>

      <form method="get" role="search" aria-label="Filter coins" className="mt-8 grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          Search
          <Input name="q" defaultValue={f.q ?? ""} placeholder="Symbol, name or address" />
        </label>
        <label className={labelClass}>
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
        <label className={labelClass}>
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
        <label className={labelClass}>
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
        <label className={labelClass}>
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
        <label className={labelClass}>
          Minimum liquidity (USD)
          <Input name="minLiquidity" type="number" min={0} step="any" defaultValue={f.minLiquidity ?? ""} />
        </label>
        <label className={labelClass}>
          Created within (days)
          <Input name="maxAgeDays" type="number" min={0} step={1} defaultValue={f.maxAgeDays ?? ""} />
        </label>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <label className={labelClass}>
            Sort
            <select name="sort" defaultValue={f.sort} className={selectClass}>
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Apply</Button>
        </div>
      </form>
      {filtered && (
        <p className="mt-4 text-sm text-med">
          {coins.length} of {data.coins.length} coins match.{" "}
          <Link href="/coins" className="text-link hover:underline">
            Clear filters
          </Link>
        </p>
      )}

      <Panel className="mt-6">
        <CoinTable rows={coins.map(row)} />
      </Panel>
      <p className="mt-3 max-w-[72ch] text-xs leading-relaxed text-pretty text-med">
        A coin stays on record after collection stops; its last values are marked stale rather than removed. Missing values are shown as a dash, never as zero. Price, market cap and liquidity are the latest Codex snapshot; market cap is circulating, not fully diluted. Rolling 24h volume is as reported across all pools. The 7-day change compares snapshot prices about seven days apart and is missing when no such pair exists. Holders counts the holder-analysis components with a value, out of nine.
      </p>
    </Container>
  );
}
