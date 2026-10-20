"use client";

import { StarIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ChainMark } from "@/components/brand/chain-mark";
import { useWatchlist } from "@/components/research/client";
import { Badge } from "@/components/ui/badge";
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

export function CoinTable({ rows }: { rows: CoinRow[] }) {
  const { ids, toggle, has } = useWatchlist();
  const [onlyWatched, setOnlyWatched] = useState(false);
  const shown = onlyWatched ? rows.filter((r) => ids.includes(r.id)) : rows;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 self-start text-xs text-med">
        <Switch checked={onlyWatched} onCheckedChange={setOnlyWatched} />
        Watchlist only ({ids.length} saved in this browser)
      </label>
      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-med px-4 py-8 text-center text-xs text-med">
          {onlyWatched ? "No watched coins match these filters. Star a coin to add it; the list stays in this browser." : "No coins match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
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
                      className="rounded p-1 text-med hover:text-high focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none"
                    >
                      <StarIcon className={cn("size-4", has(r.id) && "fill-current text-warning")} />
                    </button>
                  </TableCell>
                  <TableCell>
                    <Link href={r.href} className="inline-flex min-w-0 items-center gap-2 hover:underline">
                      <ChainMark chain={r.chain as ChainId} size={16} />
                      <span className="font-medium text-high">{r.symbol}</span>
                      {r.name && r.name !== r.symbol && <span className="max-w-40 truncate text-xs text-med">{r.name}</span>}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <div className="flex flex-wrap gap-1">
                      {r.narratives.slice(0, 2).map((n) => (
                        <Link key={n.slug} href={`/narratives/${n.slug}`}>
                          <Badge variant="neutral" className="max-w-48 truncate">
                            {n.title}
                          </Badge>
                        </Link>
                      ))}
                      {r.narratives.length > 2 && <span className="text-2xs text-med">+{r.narratives.length - 2}</span>}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", r.stale ? "text-med" : "text-high")} title={r.stale ? "Stale: older than its maximum age" : undefined}>
                    {r.price}
                    {r.stale && <span className="ml-1 text-2xs text-warning">stale</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.volume24h}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.liquidity}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.marketCap}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", r.change7d.sign === 1 && "text-positive", r.change7d.sign === -1 && "text-negative", r.change7d.sign === null && "text-med")}>{r.change7d.text}</TableCell>
                  <TableCell className="text-right text-xs text-med tabular-nums">{r.holderCoverage}/9</TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-med">{r.bottoming}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-med">{r.collection}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
