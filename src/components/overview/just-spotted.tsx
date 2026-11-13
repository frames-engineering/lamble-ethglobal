import Link from "next/link";

import { ChainMark } from "@/components/brand/chain-mark";
import { CoinFilter } from "@/components/overview/coin-filter";
import { money } from "@/components/overview/format";
import { ScanCountdown } from "@/components/overview/scan-countdown";
import { ScoutFreshness } from "@/components/overview/scout-freshness";
import { Spine, SpineLabel, type SpineTone } from "@/components/overview/spine";
import { InfoHeading } from "@/components/overview/info-heading";
import { ExternalLink } from "@/components/research/links";
import { formatDateTime } from "@/components/research/time";
import { InfoTip } from "@/components/ui/info-tip";
import { isChainId } from "@/lib/data/chains";
import { SPOTTED_INTERVAL_SECONDS, SPOTTED_STALE_SECONDS, type Spotted, type SpottedCoin, type SpottedLead } from "@/lib/lamble/site/spotted";
import { type CoinStatus, RUN_PACE_USD_PER_HOUR, coinStatus, inLatestScan, leadStatus, pace } from "@/lib/lamble/site/spotted-status";

const ROWS = 10;
const MEMBER_ROWS = 3;
const TH = "h-9 px-2 text-xs font-normal whitespace-nowrap text-med first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const TD = "px-2 py-2.5 first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const LINK = "underline-offset-4 decoration-med/50 hover:underline";
const CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const DAY_CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** Ranked parts of one whole, then the rest (docs/design/system.md). Literal, so Tailwind emits them. */
const SWATCH = ["bg-chart-r1", "bg-chart-r2", "bg-chart-r3"] as const;

/** "13:58 UTC" on the day of the scout run, "Nov 12, 13:58 UTC" before it. Fixed to the run, never the reader's clock. */
function when(v: string, reference: string): string {
  const d = new Date(v);
  return `${(d.toISOString().slice(0, 10) === reference.slice(0, 10) ? CLOCK : DAY_CLOCK).format(d)} UTC`;
}

/** Hours since the first pool at the scout run: "<1h", "7h". */
function poolAge(hours: number): string {
  return hours < 1 ? "<1h" : `${Math.floor(hours)}h`;
}

const pct = (v: number) => (v > 0 && v < 0.005 ? "<1%" : `${Math.round(v * 100)}%`);
const short = (address: string) => (address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address);

/** A chain mark, or a neutral dot for a chain the site has no icon for (ChainMark would throw and break the prerender). */
function Chain({ chain }: { chain: string }) {
  return isChainId(chain) ? <ChainMark chain={chain} size={16} className="shrink-0" /> : <span aria-hidden className="size-4 shrink-0 rounded-full bg-surface-3" />;
}

/** The section header's aside: a countdown to the next scan, or the last scan's time when it was already stale at build. */
export function SpottedAside({ spotted }: { spotted: Spotted }) {
  if (spotted.stale) return <span className="text-xs text-med">Last scan {DAY_CLOCK.format(new Date(spotted.generatedAt))} UTC</span>;
  return <ScanCountdown generatedAt={spotted.generatedAt} intervalSeconds={SPOTTED_INTERVAL_SECONDS} staleSeconds={SPOTTED_STALE_SECONDS} />;
}

/**
 * The statuses a coin row shows, as a small badge after its name. Churning and Ageing out are still decided (so a
 * churning coin is never labelled Running) but not shown.
 */
const COIN_BADGE: Partial<Record<CoinStatus, { label: string; tone: SpineTone }>> = {
  "just-in": { label: "New", tone: "heat" },
  running: { label: "Running", tone: "positive" },
};
/** The filter's order. */
const COIN_VIEWS = ["just-in", "running"] as const;

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
  const { memberBar, newNarrative, newCoinHours } = spotted.rules;
  const statuses = new Map(spotted.coins.map((c) => [c.tokenId, coinStatus(c, spotted.generatedAt)]));
  const table = (rows: SpottedCoin[]) => <CoinTable rows={rows} statuses={statuses} generatedAt={spotted.generatedAt} pad={pad} />;
  const views = [
    { id: "all", label: "All", count: spotted.coins.length, table: table(spotted.coins.slice(0, ROWS)) },
    ...COIN_VIEWS.flatMap((s) => {
      const coins = spotted.coins.filter((c) => statuses.get(c.tokenId) === s);
      return coins.length ? [{ id: s, label: COIN_BADGE[s]!.label, count: coins.length, table: table(coins.slice(0, ROWS)) }] : [];
    }),
  ];

  return (
    <ScoutFreshness generatedAt={spotted.generatedAt} maxAgeSeconds={SPOTTED_STALE_SECONDS} paused={paused}>
      <div className="grid grid-cols-1 gap-12">
        <div>
          <InfoHeading title="Possible New Narratives" label="How possible new narratives are picked">
            At least {newNarrative.minConstituents} coins sharing a theme with {money(newNarrative.minCombinedVolume24Usd)}+ combined 24h volume, shown only once a public post about the story was found. Posts are claims, not verification.
          </InfoHeading>
          {spotted.leads.length ? (
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
              {spotted.leads.map((l, i) => (
                <LeadCard key={l.id} lead={l} index={i} reference={spotted.generatedAt} pad={pad} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-sm border border-line p-4 text-sm text-med">No new theme has passed the source check since the daily refresh.</p>
          )}
        </div>

        <div>
          <InfoHeading title="New Trending Tokens" label="How new trending tokens are picked">
            Coins on the covered launchpads whose first pool is under {newCoinHours} hours old, with {money(memberBar.minVolume24Usd)}+ 24h volume or {money(memberBar.minMcapUsd)}+ market cap, and no extreme price, turnover or market-cap flag. Not yet tracked; very high turnover can include wash or bot trading.
          </InfoHeading>
          {spotted.coins.length ? <CoinFilter views={views} /> : <p className="mt-3 rounded-sm border border-line p-4 text-sm text-med">No new coin cleared the bar in the latest scan.</p>}
        </div>
      </div>
    </ScoutFreshness>
  );
}

/** What a coin's status means, with the coin's own figure. */
function statusNote(status: "just-in" | "running", c: SpottedCoin, generatedAt: string): string {
  switch (status) {
    case "just-in":
      return `First spotted in the latest scan, at ${when(c.firstSpottedAt, generatedAt)}.`;
    case "running":
      return `${money(pace(c))} of 24h volume per hour since its first pool (Running starts at ${money(RUN_PACE_USD_PER_HOUR)} an hour). Volume pace, not price.`;
  }
}

function CoinTable({
  rows,
  statuses,
  generatedAt,
  pad,
}: {
  rows: SpottedCoin[];
  statuses: Map<string, CoinStatus | null>;
  generatedAt: string;
  pad: (slug: string | null) => string;
}) {
  const max = Math.max(1, ...rows.map((c) => c.volume24Usd));
  return (
    <div className="mt-3 overflow-x-auto rounded-sm border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={TH}>
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
          {rows.map((c) => {
            const status = statuses.get(c.tokenId);
            const badge = status === "just-in" || status === "running" ? status : null;
            return (
              <tr key={c.tokenId} className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-hover">
                <td className={TD}>
                  <span className="flex min-w-0 items-center gap-2">
                    <Chain chain={c.chain} />
                    <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                      <span title={c.address} className="font-medium text-high">
                        {c.symbol}
                      </span>
                      {c.name && c.name !== c.symbol && (
                        <span title={c.name} className="max-w-24 truncate text-xs text-med sm:max-w-36">
                          {c.name}
                        </span>
                      )}
                      <code title={c.address} className="hidden font-mono text-[11px] text-med xl:inline">{short(c.address)}</code>
                    </span>
                    {badge && (
                      <InfoTip label={COIN_BADGE[badge]!.label} trigger={<SpineLabel tone={COIN_BADGE[badge]!.tone} label={COIN_BADGE[badge]!.label} />}>
                        {statusNote(badge, c, generatedAt)}
                      </InfoTip>
                    )}
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
                <td className={`${TD} font-mono hidden text-right text-xs whitespace-nowrap text-med sm:table-cell`}>{when(c.firstSpottedAt, generatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LeadCard({ lead, index, reference, pad }: { lead: SpottedLead; index: number; reference: string; pad: (slug: string | null) => string }) {
  const confirmed = leadStatus(lead) === "confirmed";
  // The scout keeps at most 12 members per theme, so the combined volume can exceed the members' sum.
  const total = Math.max(lead.combinedVolume24Usd, lead.members.reduce((a, m) => a + m.volume24Usd, 0), 1);
  const top = lead.members.slice(0, MEMBER_ROWS);
  const rest = lead.members.length - top.length;
  const restShare = Math.max(0, 1 - top.reduce((a, m) => a + m.volume24Usd / total, 0));
  const grid = "grid grid-cols-[minmax(0,1fr)_2.25rem_3.75rem_2.75rem] gap-x-3";

  return (
    <li className="relative flex min-h-48 min-w-0 flex-col overflow-hidden rounded-lg bg-card py-5 pr-5 pl-10">
      {confirmed ? (
        <Spine tone="positive" label="Narrative Confirmed" texture="flow-up" enter="climb" index={index} />
      ) : (
        // The beam marks what the latest scan brought; a lead can stay listed for up to 36h.
        <Spine tone="violet" label="Potential Narrative" enter="drop" beam={inLatestScan(lead.firstSpottedAt, reference)} beamLap="10s" index={index} />
      )}
      <p className="text-xs text-med">First spotted {when(lead.firstSpottedAt, reference)}</p>
      <h4 className="mt-1 text-lg leading-snug font-medium text-balance text-high">
        {confirmed ? (
          <Link href={`/narratives/${lead.narrativeSlug}`} className={LINK}>
            {lead.narrativeTitle}
          </Link>
        ) : (
          lead.title
        )}
      </h4>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {(
          [
            ["Volume 24h", money(lead.combinedVolume24Usd)],
            ["Coins", String(lead.size)],
            ["Launchpads", String(lead.launchpads.length)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-med">{label}</dt>
            <dd className="mt-1 font-mono text-sm text-high">{value}</dd>
          </div>
        ))}
      </dl>

      {(lead.sourceSays || lead.sources.length > 0) && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-xs text-med">What the posts say</p>
          {lead.sourceSays && <p className="mt-2 text-sm leading-relaxed text-pretty">{lead.sourceSays}</p>}
          {lead.sources.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {lead.sources.map((s) => (
                <li key={s.postId} className="flex min-w-0 items-baseline gap-1.5">
                  <ExternalLink href={s.url} className="truncate">
                    @{s.author}
                  </ExternalLink>
                  {s.createdAt && <span className="shrink-0 text-med">{when(s.createdAt, reference)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-xs text-med">{confirmed ? "Coins sharing the theme" : "Coins carrying it"}, by share of 24h volume</p>
        <div aria-hidden className="mt-3 flex h-2 overflow-hidden">
          {top.map((m, i) => (
            <span key={m.tokenId} className={SWATCH[i]} style={{ flexGrow: m.volume24Usd / total, flexBasis: 0 }} />
          ))}
          {restShare > 0 && <span className="bg-chart-0" style={{ flexGrow: restShare, flexBasis: 0 }} />}
        </div>
        <div className={`mt-2 text-[11px] text-med ${grid}`}>
          <span>Coin</span>
          <span className="text-right">Age</span>
          <span className="text-right">24h</span>
          <span className="text-right">Share</span>
        </div>
        <ul className="mt-1">
          {top.map((m, i) => (
            <li key={m.tokenId} className={`items-center border-t border-line py-2 first:border-t-0 ${grid}`}>
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className={`size-2 shrink-0 ${SWATCH[i]}`} />
                <Chain chain={m.tokenId.split(":")[0] ?? ""} />
                <span className="shrink-0 font-medium">{m.symbol}</span>
                <span className="min-w-0 truncate text-xs text-med">{pad(m.launchpadSlug)}</span>
              </span>
              <span className="font-mono text-right text-xs text-link">{m.ageHours === null ? "—" : poolAge(m.ageHours)}</span>
              <span className="font-mono text-right text-[13px]">{money(m.volume24Usd)}</span>
              <span className="font-mono text-right text-[13px]">{pct(m.volume24Usd / total)}</span>
            </li>
          ))}
          {rest > 0 && (
            <li className="flex items-center gap-2 border-t border-line py-2 text-xs text-med">
              <span aria-hidden className="size-2 bg-chart-0" />
              {rest} more
            </li>
          )}
        </ul>
      </div>

    </li>
  );
}
