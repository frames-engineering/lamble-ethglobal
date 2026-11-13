import Link from "next/link";

import { ChainMark } from "@/components/brand/chain-mark";
import { money } from "@/components/overview/format";
import { ScoutFreshness } from "@/components/overview/scout-freshness";
import { ExternalLink } from "@/components/research/links";
import { formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import type { ChainId } from "@/lib/data/types";
import { SPOTTED_STALE_SECONDS, type Spotted, type SpottedLead } from "@/lib/lamble/site/spotted";

const ROWS = 10;
const TH = "h-9 px-2 text-xs font-normal whitespace-nowrap text-med first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const TD = "px-2 py-2.5 first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const LINK = "underline-offset-4 decoration-med/50 hover:underline";
const CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const DAY_CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "13:58 UTC" on the day of the scout run, "Nov 12, 13:58 UTC" before it. Fixed to the run, never the reader's clock. */
function when(v: string, reference: string): string {
  const d = new Date(v);
  return `${(d.toISOString().slice(0, 10) === reference.slice(0, 10) ? CLOCK : DAY_CLOCK).format(d)} UTC`;
}

/** Hours since the first pool at the scout run: "<1h", "7h". */
function poolAge(hours: number): string {
  return hours < 1 ? "<1h" : `${Math.floor(hours)}h`;
}

const short = (address: string) => (address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address);

/**
 * The hourly scout's finds since the daily refresh: possible new narratives (only once a public post backs the story,
 * or a tracked narrative covers the theme) and new coins on the covered launchpads. Observations, not reviewed.
 */
export function JustSpotted({ spotted, launchpadNames }: { spotted: Spotted; launchpadNames: Record<string, string> }) {
  const pad = (slug: string | null) => (slug ? (launchpadNames[slug] ?? slug) : "—");
  const paused = (
    <p className="rounded-sm border border-line p-4 text-sm text-med">
      The hourly scout has not reported since {formatDateTime(spotted.generatedAt)}, so nothing is listed here. The daily refresh is unaffected.
    </p>
  );
  // Stale at build: say so. Fresh at build: the reader's clock re-checks, because nothing rebuilds the page if the scout stops.
  if (spotted.stale) return paused;
  const rows = spotted.coins.slice(0, ROWS);
  const max = Math.max(1, ...rows.map((c) => c.volume24Usd));
  const { memberBar, newNarrative, newCoinHours } = spotted.rules;

  return (
    <ScoutFreshness generatedAt={spotted.generatedAt} maxAgeSeconds={SPOTTED_STALE_SECONDS} paused={paused}>
      <div className="grid gap-8">
        <div>
          <h3 className="text-sm font-medium text-high">Possible new narratives</h3>
          <p className="mt-1 max-w-[72ch] text-xs text-med">
            At least {newNarrative.minConstituents} coins sharing a theme with {money(newNarrative.minCombinedVolume24Usd)}+ combined 24h volume, shown only once a public post about the story was found. Posts are claims, not verification.
          </p>
          {spotted.leads.length ? (
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
              {spotted.leads.map((l) => (
                <LeadCard key={l.id} lead={l} reference={spotted.generatedAt} pad={pad} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-sm border border-line p-4 text-sm text-med">No new theme has passed the source check since the daily refresh.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-high">New coins</h3>
          <p className="mt-1 max-w-[72ch] text-xs text-med">
            Coins on the covered launchpads whose first pool is under {newCoinHours} hours old, with {money(memberBar.minVolume24Usd)}+ 24h volume or {money(memberBar.minMcapUsd)}+ market cap, and no extreme price, turnover or market-cap flag. Not yet tracked; very high turnover can include wash or bot trading.
          </p>
          {rows.length ? (
            <div className="mt-3 overflow-x-auto rounded-sm border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th scope="col" className={`${TH} max-sm:pl-3`}>
                      Token
                    </th>
                    <th scope="col" className={`${TH} hidden md:table-cell`}>
                      Launchpad
                    </th>
                    <th scope="col" className={`${TH} hidden text-right sm:table-cell`} title="Time since the coin's first pool opened, at the scout run">
                      Age
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Volume, 24h
                    </th>
                    <th scope="col" className={`${TH} hidden text-right lg:table-cell`}>
                      Market cap
                    </th>
                    <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>
                      First spotted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.tokenId} className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-hover">
                      <td className={`${TD} max-sm:pl-3`}>
                        <span className="flex min-w-0 items-center gap-2">
                          <ChainMark chain={c.chain as ChainId} size={16} />
                          <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                            <span title={c.address} className="font-medium text-high">
                              {c.symbol}
                            </span>
                            {c.name && c.name !== c.symbol && (
                              <span title={c.name} className="max-w-24 truncate text-xs text-med sm:max-w-36">
                                {c.name}
                              </span>
                            )}
                            <code title={c.address} className="hidden font-mono text-[11px] text-med xl:inline">
                              {short(c.address)}
                            </code>
                          </span>
                        </span>
                      </td>
                      <td className={`${TD} hidden text-xs text-med md:table-cell`}>{pad(c.launchpadSlug)}</td>
                      <td className={`${TD} font-mono hidden text-right text-xs text-link sm:table-cell`}>{poolAge(c.ageHours)}</td>
                      <td className={TD}>
                        <div className="relative ml-auto h-6 w-full max-w-40 sm:min-w-28">
                          <span aria-hidden className="absolute inset-y-0 left-0 hidden bg-chart-bar sm:block" style={{ width: `${(c.volume24Usd / max) * 100}%` }} />
                          <span className="font-mono relative flex h-full items-center justify-end text-[13px] sm:pr-2">{money(c.volume24Usd)}</span>
                        </div>
                      </td>
                      <td className={`${TD} font-mono hidden text-right text-[13px] lg:table-cell`}>{money(c.mcapUsd)}</td>
                      <td className={`${TD} font-mono hidden text-right text-xs whitespace-nowrap text-med sm:table-cell`}>{when(c.firstSpottedAt, spotted.generatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 rounded-sm border border-line p-4 text-sm text-med">No new coin cleared the bar in the latest scan.</p>
          )}
        </div>
      </div>
    </ScoutFreshness>
  );
}

function LeadCard({ lead, reference, pad }: { lead: SpottedLead; reference: string; pad: (slug: string | null) => string }) {
  const tracked = lead.status === "tracked";
  const symbols = lead.members.map((m) => m.symbol);
  return (
    <li className="flex min-w-0 flex-col rounded-lg bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={tracked ? "link" : "warning"}>{tracked ? "Tracked narrative" : "Story found, not yet tracked"}</Badge>
        <span className="text-xs text-med">First spotted {when(lead.firstSpottedAt, reference)}</span>
      </div>
      <h4 className="mt-2 text-base font-medium text-balance text-high">
        {tracked ? (
          <Link href={`/narratives/${lead.narrativeSlug}`} className={LINK}>
            {lead.narrativeTitle}
          </Link>
        ) : (
          lead.title
        )}
      </h4>
      <p className="mt-1 text-xs text-med">
        {lead.size} coins · {money(lead.combinedVolume24Usd)} combined 24h volume · {lead.launchpads.map(pad).join(", ") || "—"}
      </p>
      {lead.sourceSays && <p className="mt-3 text-sm leading-relaxed text-pretty text-med">{lead.sourceSays}</p>}
      <p className="mt-3 truncate font-mono text-xs text-med" title={symbols.join(" ")}>
        {symbols.join(" · ")}
      </p>
      {lead.sources.length > 0 && (
        <ul className="mt-3 grid gap-1">
          {lead.sources.map((s) => (
            <li key={s.postId} className="flex min-w-0 gap-2 text-xs">
              <Badge variant="neutral">X post</Badge>
              <ExternalLink href={s.url} className="truncate">
                @{s.author}
              </ExternalLink>
              {s.createdAt && <span className="shrink-0 text-med">{when(s.createdAt, reference)}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-auto pt-3 text-xs text-med">
        {tracked ? "These coins share a tracked narrative's theme; the daily refresh decides which become members." : "Joins full tracking only if the daily refresh confirms it."}
      </p>
    </li>
  );
}
