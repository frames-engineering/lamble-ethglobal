"use client";

import Link from "next/link";
import { useState } from "react";

import { ChainMark } from "@/components/brand/chain-mark";
import { Sparkline } from "@/components/charts/sparkline";
import type { TrendingToken } from "@/components/overview/data";
import { Change, age, isNew, money } from "@/components/overview/format";
import { coinHref } from "@/components/research/links";
import { Segmented } from "@/components/ui/segmented";
import type { ChainId } from "@/lib/data/types";

const SORTS = [
  ["volume", "Most traded"],
  ["gainers", "Top gainers"],
  ["newest", "Newest"],
] as const;
type Sort = (typeof SORTS)[number][0];

const ROWS = 10;
const last = (v: number | null, fallback: number) => (v === null ? fallback : v);
const ORDER: Record<Sort, (a: TrendingToken, b: TrendingToken) => number> = {
  volume: (a, b) => last(b.volume24h, -1) - last(a.volume24h, -1),
  gainers: (a, b) => last(b.change24h, -Infinity) - last(a.change24h, -Infinity),
  newest: (a, b) => last(a.ageDays, Infinity) - last(b.ageDays, Infinity),
};

const TH = "h-9 px-2 text-xs font-normal whitespace-nowrap text-med first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const TD = "px-2 py-2.5 first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const LINK = "underline-offset-4 decoration-med/50 hover:underline";

/** Every token LAMBLE collects, three ways in: by volume, by 24h move, by age. */
export function TrendingTokens({ tokens }: { tokens: TrendingToken[] }) {
  const [sort, setSort] = useState<Sort>("volume");
  const rows = [...tokens].sort(ORDER[sort]).slice(0, ROWS);
  const max = Math.max(1, ...rows.map((t) => t.volume24h ?? 0));

  return (
    <div>
      <Segmented label="Sort tokens" options={SORTS} value={sort} onChange={setSort} />
      <div className="mt-3 overflow-x-auto rounded-sm border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className={`${TH} hidden w-8 sm:table-cell`}>
                #
              </th>
              <th scope="col" className={`${TH} max-sm:pl-3`}>
                Token
              </th>
              <th scope="col" className={`${TH} hidden md:table-cell`}>
                Narrative
              </th>
              <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>
                Age
              </th>
              <th scope="col" className={`${TH} hidden xl:table-cell`}>
                Volume, 30d
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Volume, 24h
              </th>
              <th scope="col" className={`${TH} text-right`}>
                24h
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id} className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-hover">
                <td className={`${TD} font-mono hidden text-xs text-med sm:table-cell`}>{i + 1}</td>
                <td className={`${TD} max-sm:pl-3`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <ChainMark chain={t.chain as ChainId} size={16} />
                    <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                      <span className="flex items-center gap-1.5">
                        <Link href={coinHref(t.chain, t.address)} className={`font-medium ${LINK}`}>
                          {t.symbol ?? `${t.address.slice(0, 6)}…`}
                        </Link>
                        {isNew(t.ageDays) && <span className="rounded-xs bg-link-soft px-1.5 text-[10px] leading-4 font-medium text-link sm:hidden">New</span>}
                      </span>
                      {t.name && t.name !== t.symbol && (
                        <span title={t.name} className="max-w-24 truncate text-xs text-med sm:max-w-36">
                          {t.name}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className={`${TD} hidden max-w-56 md:table-cell`}>
                  {t.narrative ? (
                    <Link href={`/narratives/${t.narrative.slug}`} title={t.narrative.title} className={`block truncate text-xs text-med hover:text-high ${LINK}`}>
                      {t.narrative.title}
                    </Link>
                  ) : (
                    <span className="text-xs text-med">—</span>
                  )}
                </td>
                <td className={`${TD} font-mono hidden text-right text-xs sm:table-cell ${isNew(t.ageDays) ? "text-link" : "text-med"}`}>{age(t.ageDays)}</td>
                <td className={`${TD} hidden xl:table-cell`}>
                  <Sparkline id={`tk-${t.id}`} points={t.volumeDaily} width={96} height={20} strokeWidth={1.25} className="text-med" />
                </td>
                <td className={TD}>
                  <div className="relative ml-auto h-6 w-full max-w-40 sm:min-w-28">
                    <span aria-hidden className="absolute inset-y-0 left-0 hidden bg-chart-bar sm:block" style={{ width: `${((t.volume24h ?? 0) / max) * 100}%` }} />
                    <span className={`font-mono relative flex h-full items-center justify-end text-[13px] sm:pr-2`}>{money(t.volume24h)}</span>
                  </div>
                </td>
                <td className={`${TD} font-mono text-right text-[13px] whitespace-nowrap`}>
                  <Change value={t.change24h} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
