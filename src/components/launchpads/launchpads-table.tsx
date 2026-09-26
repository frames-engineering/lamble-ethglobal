"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { COLUMNS, hasCurve, type CellContext, type ColumnId } from "@/components/launchpads/columns";
import { LaunchpadDetailSheet } from "@/components/launchpads/launchpad-detail-sheet";
import { TableToolbar } from "@/components/launchpads/table-toolbar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobileAtMount } from "@/hooks/use-is-mobile-at-mount";
import { CHAIN_ORDER, chainInfo } from "@/lib/data/chains";
import type { ChainId, Launchpad, Timeframe } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type SortState = { id: ColumnId; dir: "asc" | "desc" };
const DEFAULT_SORT: SortState = { id: "fees", dir: "desc" };

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

export function LaunchpadsTable({ launchpads }: { launchpads: Launchpad[] }) {
  const [tf, setTf] = useState<Timeframe>("d7");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [query, setQuery] = useState("");
  const [chains, setChains] = useState<ChainId[]>([]);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const mobile = useIsMobileAtMount();

  const onOpen = useCallback((slug: string) => setOpenSlug(slug), []);
  const medianGradRate = useMemo(
    () => median(launchpads.filter(hasCurve).map((l) => l.metrics.graduationRate7d).filter((v): v is number => v !== null)),
    [launchpads],
  );
  const ctx = useMemo<CellContext>(() => ({ tf, medianGradRate, onOpen }), [tf, medianGradRate, onOpen]);
  const availableChains = useMemo(
    () => CHAIN_ORDER.filter((c) => launchpads.some((l) => l.chains.includes(c))),
    [launchpads],
  );
  const columns = useMemo(() => (mobile ? [...COLUMNS].sort((a, b) => a.mobileRank - b.mobileRank) : COLUMNS), [mobile]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = launchpads.filter((l) => {
      if (chains.length > 0 && !l.chains.some((c) => chains.includes(c))) return false;
      if (q) {
        const hay = [l.name, l.domain, ...l.chains.map((c) => chainInfo(c).name)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const col = COLUMNS.find((c) => c.id === sort.id);
    const sv = col?.sortValue;
    if (!sv) return filtered;
    return [...filtered].sort((a, b) => {
      const av = sv(a, ctx);
      const bv = sv(b, ctx);
      if (av === null) return bv === null ? 0 : 1;
      if (bv === null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [launchpads, query, chains, sort, ctx]);

  const toggleSort = (id: ColumnId) =>
    setSort((prev) => {
      const textual = id === "launchpad";
      const first: SortState = { id, dir: textual ? "asc" : "desc" };
      if (prev.id !== id) return first;
      const second: SortState = { id, dir: textual ? "desc" : "asc" };
      if (prev.dir === first.dir) return second;
      return DEFAULT_SORT;
    });

  const clear = () => {
    setQuery("");
    setChains([]);
  };

  const selected = openSlug ? (launchpads.find((l) => l.slug === openSlug) ?? null) : null;

  return (
    <>
      <div className="border-y border-card-line bg-card p-4 shadow-sm xs:rounded-xl xs:border">
        <TableToolbar
          query={query}
          onQuery={setQuery}
          chains={chains}
          onChains={setChains}
          availableChains={availableChains}
          tf={tf}
          onTf={setTf}
        />

        <div className="mt-4">
          <Table className="w-full min-w-[880px]">
            <TableHeader>
              <TableRow className="h-auto border-0 hover:bg-transparent">
                {columns.map((c) => {
                  const sorted = sort.id === c.id;
                  const label = c.header(ctx);
                  return (
                    <TableHead
                      key={c.id}
                      scope="col"
                      aria-sort={sorted ? (sort.dir === "desc" ? "descending" : "ascending") : undefined}
                      title={c.hint}
                      className={cn(c.align === "right" && "text-right", c.className)}
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.id)}
                          className={cn(
                            "inline-flex items-center gap-1 whitespace-nowrap select-none transition-colors hover:text-high focus-visible:text-high focus-visible:outline-none",
                            c.align === "right" && "justify-end",
                          )}
                        >
                          {sorted &&
                            (sort.dir === "desc" ? (
                              <ArrowDownIcon className="size-3.5" aria-hidden />
                            ) : (
                              <ArrowUpIcon className="size-3.5" aria-hidden />
                            ))}
                          <span>{label}</span>
                        </button>
                      ) : (
                        <span>{label}</span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="py-10 text-center text-sm whitespace-normal text-med">
                    No launchpads match these filters.{" "}
                    <Button type="button" variant="text" size="sm" onClick={clear}>
                      Clear filters
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.slug}
                    tabIndex={0}
                    aria-label={`${row.name}, open details`}
                    onClick={() => onOpen(row.slug)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpen(row.slug);
                      }
                    }}
                    className="cursor-pointer focus-visible:bg-hover focus-visible:outline-none"
                  >
                    {columns.map((c) => (
                      <TableCell key={c.id} className={cn(c.align === "right" && "text-right", c.className)}>
                        {c.cell(row, ctx)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <LaunchpadDetailSheet launchpad={selected} onClose={() => setOpenSlug(null)} />
    </>
  );
}
