"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useId, useRef, useState } from "react";

import { ChainMark } from "@/components/brand/chain-mark";
import { Sparkline } from "@/components/charts/sparkline";
import { AreaChart } from "@/components/overview/area-chart";
import type { FeaturedNarrative } from "@/components/overview/data";
import { Change, age, isNew, money } from "@/components/overview/format";
import { TrendLabel, TrendSpine, hasTrendLabel } from "@/components/overview/trend-spine";
import { coinHref } from "@/components/research/links";
import { Segmented } from "@/components/ui/segmented";
import type { ChainId } from "@/lib/data/types";

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const day = (iso: string) => DAY.format(new Date(iso));
const pct = (v: number) => (v > 0 && v < 0.005 ? "<1%" : `${Math.round(v * 100)}%`);
const RANGES = [
  ["7d", "7D hourly"],
  ["30d", "30D daily"],
] as const;

/**
 * The page's lead: the featured narratives as a ranked list, and the selected one opened up with its volume,
 * the editorial reading of why it moves, and the tokens carrying it.
 */
export function NarrativeExplorer({ narratives }: { narratives: FeaturedNarrative[] }) {
  const [selected, setSelected] = useState(0);
  const [range, setRange] = useState<(typeof RANGES)[number][0]>("7d");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const n = narratives[selected];
  if (!n) return null;

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const len = narratives.length;
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    const next = e.key === "Home" ? 0 : e.key === "End" ? len - 1 : delta ? (i + delta + len) % len : null;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation(); // the prototype picker also listens for arrows
    setSelected(next);
    tabs.current[next]?.focus();
  }

  const segments = [...n.tokens.map((t, i) => ({ id: t.id, share: t.share, color: `var(--color-viz-r${i + 1})` })), ...(n.others.share > 0 ? [{ id: "others", share: n.others.share, color: "var(--color-viz-0)" }] : [])];

  return (
    <div className="overflow-hidden rounded-sm border border-line lg:grid lg:grid-cols-[minmax(0,18.5rem)_minmax(0,1fr)]">
      <div role="tablist" aria-label="Trending narratives" aria-orientation="vertical" className="flex overflow-x-auto border-b border-line scrollbar-none lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0">
        {narratives.map((x, i) => {
          const on = i === selected;
          return (
            <button
              key={x.slug}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${i}`}
              aria-selected={on}
              aria-controls={`${base}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => setSelected(i)}
              onKeyDown={(e) => onKey(e, i)}
              // The leading 32px is the status spine's (20px) and its gap. The selected row's bar sits on the edge that
              // meets the panel on desktop, leaving the leading edge to the spine.
              className={`relative flex w-64 shrink-0 flex-col border-r border-line py-3.5 pr-4 pl-8 text-left transition-colors duration-150 last:border-r-0 lg:w-auto lg:border-r-0 lg:border-b lg:last:border-b-0 ${
                on
                  ? "bg-active after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-high lg:after:inset-x-auto lg:after:inset-y-0 lg:after:right-0 lg:after:h-auto lg:after:w-0.5"
                  : "hover:bg-hover"
              }`}
            >
              <TrendSpine trend={x.trend} index={i} />
              {/* The rank gets its own line above the row, so the title takes the full width and the sparkline lines up with it. */}
              <span className="mb-1 font-mono text-xs text-med">{i + 1}</span>
              <span className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm leading-snug font-medium">{x.title}</span>
                  <span className="mt-1.5 block font-mono text-xs text-med">{money(x.volume7d)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                  <Sparkline id={`ex-${x.slug}`} points={x.daily} width={56} height={18} fill={false} strokeWidth={1.25} className="text-med" />
                  <span className={`font-mono text-xs`}>
                    <Change value={x.change7d} empty={x.trend === "new" ? "new" : "—"} />
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${selected}`} className="min-w-0 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-med">
          <p className="flex flex-wrap items-center gap-x-2">
            {hasTrendLabel(n.trend) && (
              <>
                <TrendLabel trend={n.trend} />
                <span aria-hidden>·</span>
              </>
            )}
            {n.coins} coins
            <span aria-hidden>·</span>
            tracked since {day(n.since)}
          </p>
          <Link href={`/narratives/${n.slug}`} className="relative inline-flex items-center gap-1 transition-colors duration-150 before:absolute before:-inset-2 hover:text-high">
            Open narrative
            <ArrowRightIcon aria-hidden className="size-3.5" />
          </Link>
        </div>
        <h3 className="mt-2 text-2xl leading-tight font-medium text-balance">{n.title}</h3>

        <dl className="mt-5 grid grid-cols-3 gap-4">
          {[
            ["Volume, 7d", money(n.volume7d)],
            ["vs prior week", <Change key="c" value={n.change7d} empty={n.trend === "new" ? "new" : "—"} />],
            ["Volume, 24h", money(n.volume24h)],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0">
              <dt className="text-xs text-med">{label}</dt>
              <dd className={`font-mono mt-1 text-lg md:text-xl`}>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Volume</p>
            <Segmented label="Chart range" options={RANGES} value={range} onChange={setRange} />
          </div>
          <AreaChart key={`${n.slug}-${range}`} points={range === "7d" ? n.hourly : n.daily} unit={range === "7d" ? "hour" : "day"} label={`${n.title}: ${range === "7d" ? "hourly volume, last 7 days" : "daily volume, last 30 days"}`} />
        </div>

        {n.why && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs text-med">Why it&rsquo;s moving{n.whyAt && <> · as read on {day(n.whyAt)}</>}</p>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-pretty">{n.why}</p>
          </div>
        )}

        {n.tokens.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs text-med">Tokens carrying it, by share of 24h volume</p>
            <div aria-hidden className="mt-3 flex h-2 overflow-hidden">
              {segments.map((s) => (
                <span key={s.id} style={{ flexGrow: s.share, flexBasis: 0, background: s.color }} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_2.5rem_4.5rem_3rem] gap-x-3 text-[11px] text-med">
              <span>Token</span>
              <span className="text-right">Age</span>
              <span className="text-right">24h</span>
              <span className="text-right">Share</span>
            </div>
            <ul className="mt-1">
              {n.tokens.map((t, i) => (
                <li key={t.id} className="border-t border-line first:border-t-0">
                  <Link
                    href={coinHref(t.chain, t.address)}
                    className="-mx-2 grid grid-cols-[minmax(0,1fr)_2.5rem_4.5rem_3rem] items-center gap-x-3 rounded-sm px-2 py-2 transition-colors duration-150 hover:bg-hover"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="size-2 shrink-0" style={{ background: `var(--color-viz-r${i + 1})` }} />
                      <ChainMark chain={t.chain as ChainId} size={16} />
                      <span className="font-medium">{t.symbol}</span>
                      {t.name && t.name !== t.symbol && <span className="hidden truncate text-xs text-med sm:inline">{t.name}</span>}
                    </span>
                    <span className={`font-mono text-right text-xs ${isNew(t.ageDays) ? "text-link" : "text-med"}`}>{age(t.ageDays)}</span>
                    <span className={`font-mono text-right text-[13px]`}>
                      <Change value={t.change24h} />
                    </span>
                    <span className={`font-mono text-right text-[13px]`}>{pct(t.share)}</span>
                  </Link>
                </li>
              ))}
              {n.others.count > 0 && (
                <li className="grid grid-cols-[minmax(0,1fr)_3rem] gap-x-3 border-t border-line py-2 text-xs text-med">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2 bg-chart-0" />
                    {n.others.count} more
                  </span>
                  <span className={`font-mono text-right`}>{pct(n.others.share)}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
