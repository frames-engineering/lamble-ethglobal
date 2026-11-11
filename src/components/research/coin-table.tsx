"use client";

import { StarIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ChainMark } from "@/components/brand/chain-mark";
import { useWatchlist } from "@/components/research/client";
import { EmptyState } from "@/components/research/panel";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChainId } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** One screener row: preformatted on the server so the client never needs the release or formatting rules. */
export interface CoinRow {
  id: string;
  href: string;
  chain: string;
  symbol: string;
  name: string | null;
  narratives: { slug: string; title: string }[];
  price: string;
  volume24h: string;
  liquidity: string;
  marketCap: string;
  change7d: { text: string; sign: -1 | 0 | 1 | null };
  stale: boolean;
  holderCoverage: number;
  bottoming: string;
  collection: string;
}

/** Figures: right-aligned mono, the size the overview's token table uses. */
const FIG = "text-right font-mono text-[13px]";
const LINK = "underline-offset-4 decoration-med/50 hover:underline";

export function CoinTable({ rows }: { rows: CoinRow[] }) {
  const { ids, toggle, has } = useWatchlist();
  const [onlyWatched, setOnlyWatched] = useState(false);
  const shown = onlyWatched ? rows.filter((r) => ids.includes(r.id)) : rows;
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 self-start text-xs text-med">
        <Switch checked={onlyWatched} onCheckedChange={setOnlyWatched} />
        Watchlist only ({ids.length} saved in this browser)
      </label>
      {shown.length === 0 ? (
        onlyWatched ? (
          <EmptyState title="No watched coins match these filters">Star a coin to add it; the list stays in this browser.</EmptyState>
        ) : (
          <EmptyState title="No coins match these filters" />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <span className="sr-only">Watch</span>
              </TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Narratives</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Vol 24h</TableHead>
              <TableHead className="text-right">Liquidity</TableHead>
              <TableHead className="text-right">Mcap</TableHead>
              <TableHead className="text-right">7d</TableHead>
              <TableHead className="text-right" title="Holder-analysis components with a value, of nine">
                Holders
              </TableHead>
              <TableHead>Bottoming</TableHead>
              <TableHead>Collection</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    aria-pressed={has(r.id)}
                    aria-label={has(r.id) ? `Stop watching ${r.symbol}` : `Watch ${r.symbol}`}
                    className="rounded p-1 text-med transition-colors duration-150 hover:text-high focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none"
                  >
                    <StarIcon className={cn("size-4", has(r.id) && "fill-current text-warning")} />
                  </button>
                </TableCell>
                <TableCell>
                  <span className="flex min-w-0 items-center gap-2">
                    <ChainMark chain={r.chain as ChainId} size={16} />
                    <Link href={r.href} className={`font-medium text-high ${LINK}`}>
                      {r.symbol}
                    </Link>
                    {r.name && r.name !== r.symbol && (
                      <span title={r.name} className="max-w-40 truncate text-xs text-med">
                        {r.name}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="max-w-56">
                  {r.narratives.length ? (
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                      {r.narratives.slice(0, 2).map((n) => (
                        <Link key={n.slug} href={`/narratives/${n.slug}`} title={n.title} className={`max-w-48 truncate text-med transition-colors duration-150 hover:text-high ${LINK}`}>
                          {n.title}
                        </Link>
                      ))}
                      {r.narratives.length > 2 && <span className="text-low">+{r.narratives.length - 2}</span>}
                    </span>
                  ) : (
                    <span className="text-xs text-med">—</span>
                  )}
                </TableCell>
                <TableCell className={cn(FIG, r.stale ? "text-med" : "text-high")} title={r.stale ? "Stale: older than its maximum age" : undefined}>
                  {r.price}
                  {r.stale && <span className="ml-1.5 font-sans text-xs text-warning">stale</span>}
                </TableCell>
                <TableCell className={FIG}>{r.volume24h}</TableCell>
                <TableCell className={FIG}>{r.liquidity}</TableCell>
                <TableCell className={FIG}>{r.marketCap}</TableCell>
                <TableCell className={cn(FIG, r.change7d.sign === 1 && "text-positive", r.change7d.sign === -1 && "text-negative", r.change7d.sign === null && "text-med")}>{r.change7d.text}</TableCell>
                <TableCell className={cn(FIG, "text-med")}>{r.holderCoverage}/9</TableCell>
                <TableCell className="text-xs text-med">{r.bottoming}</TableCell>
                <TableCell className="text-xs text-med">{r.collection}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
