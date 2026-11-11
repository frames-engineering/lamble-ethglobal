import type { Metadata } from "next";

import { HistoryChart } from "@/components/launchpads/history-chart";
import { launchpadHistory } from "@/components/launchpads/history";
import { LaunchpadsTable } from "@/components/launchpads/launchpads-table";
import { Container } from "@/components/layout/container";
import { Change } from "@/components/overview/format";
import { KeyFigure, KeyFigures } from "@/components/research/figures";
import { AgentAccess } from "@/components/research/agent-access";
import { PageHeader, Section } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { InfoTip } from "@/components/ui/info-tip";
import { apiPaths } from "@/lib/lamble/api/paths";
import { toLaunchpadView } from "@/lib/lamble/site/launchpads";
import { loadRelease } from "@/lib/lamble/service";
import { compactUsd, int } from "@/lib/format";

export const metadata: Metadata = {
  title: "Launchpads",
  description: "Launchpad economics: fees, revenue and creator earnings per venue from DefiLlama, provider-indexed launch activity, fee models, and which tracked coins and narratives each venue originated.",
  alternates: { canonical: "/launchpads" },
};

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const MONTH = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
/** The history charts open on the last 90 days; the brush drags out to the whole history. */
const BRUSH_DAYS = 90;

export default function LaunchpadsPage() {
  const { data } = loadRelease();
  const views = data.launchpads.map(toLaunchpadView);
  const { feeSubtotal: fees, creatorEarnings: creators, indexed } = data.market;
  const lastDay = fees.history30d[fees.history30d.length - 1];
  const included = data.launchpads.filter((l) => l.feeSubtotal.included).length;
  const history = launchpadHistory();

  return (
    <Container>
      <PageHeader
        title="Launchpads"
        description="Where the trenches’ coins are launched: what each venue earns in fees, what it pays creators, and how many coins it creates and graduates."
        meta={
          <>
            <span>Fees for settled UTC days to {formatDate(fees.anchor)}</span>
            <span className="lg:hidden">Data through {formatDateTime(data.dataCutoff)}</span>
          </>
        }
      />

      <KeyFigures className="mt-8">
        <KeyFigure
          label={
            <>
              Launchpad fees, {lastDay ? DAY.format(new Date(lastDay.time * 1000)) : "last day"}
              <InfoTip label="What launchpad fees include">{fees.scope}</InfoTip>
            </>
          }
          sub={
            <>
              <Change value={fees.change7dPct} /> last 7d vs prior 7d
            </>
          }
        >
          {compactUsd(fees.value, 2)}
        </KeyFigure>
        <KeyFigure
          label={
            <>
              Creator earnings, 7d
              <InfoTip label="What creator earnings include">{creators.scope}</InfoTip>
            </>
          }
          sub={`${creators.venues.length} venues report it`}
        >
          {compactUsd(creators.value7d, 2)}
        </KeyFigure>
        <KeyFigure
          label={
            <>
              Coins created, 24h
              <InfoTip label="About indexed launch counts">
                {indexed.scope} Creations from {indexed.creationVenues} venues, completions from {indexed.completionVenues}.
              </InfoTip>
            </>
          }
          sub={indexed.completed24 === null ? "Graduations not indexed" : `${int(indexed.completed24)} graduated`}
        >
          {int(indexed.created24)}
        </KeyFigure>
        <KeyFigure
          label={
            <>
              Launchpads tracked
              <InfoTip label="Why some venues are left out of the fee subtotal">
                {data.launchpads.length - included} venues share fee streams with another venue and are left out of the fee subtotal; their own figures are shown unchanged.
              </InfoTip>
            </>
          }
          sub={`${included} in the fee subtotal`}
        >
          {String(data.launchpads.length)}
        </KeyFigure>
      </KeyFigures>

      <Section
        id="venues"
        title="Fees and launches by venue"
        description="Fees, revenue and creator earnings are DefiLlama values; launch and graduation counts come from Codex’s beta index and are marked ≈. Select a row for its summary."
      >
        <LaunchpadsTable launchpads={views} />
      </Section>

      {history && (
        <>
          <Section
            id="fees"
            title="Fees by launchpad"
            description={`Daily fees for the ${history.venues} launchpads whose fee streams don’t overlap, back to ${MONTH.format(new Date(history.since * 1000))}. Drag the window under the chart for more history; Share shows each venue’s part of the day.`}
          >
            <div className="rounded-sm border border-line p-4 md:p-5">
              <HistoryChart series={history.fees.series} days={history.fees.days} unit="usd" caption="Daily launchpad fees" brushDays={BRUSH_DAYS} withShare />
            </div>
          </Section>

          <Section
            id="revenue"
            title="Revenue by launchpad"
            description="What the same launchpads keep from those fees each day. The rest is paid to coin creators and, on some venues, to holders or traders."
          >
            <div className="rounded-sm border border-line p-4 md:p-5">
              <HistoryChart series={history.revenue.series} days={history.revenue.days} unit="usd" caption="Daily launchpad revenue" brushDays={BRUSH_DAYS} />
            </div>
          </Section>

          {history.launches.since !== null && (
            <Section
              id="launches"
              title="Coins launched"
              description={`Coins created on each launchpad in the 24 hours before each daily snapshot (about 06:00 UTC), from Codex’s beta index. Snapshots began ${DAY.format(new Date(history.launches.since * 1000))}; days without one are blank.`}
            >
              <div className="rounded-sm border border-line p-4 md:p-5">
                <HistoryChart series={history.launches.series} days={history.launches.days} unit="count" caption="Coins created per day" />
              </div>
            </Section>
          )}
        </>
      )}

      <AgentAccess
        subject="launchpad economics across all tracked venues"
        discoveryPath={apiPaths.launchpads()}
        paidPath={apiPaths.launchpadsDataset()}
        kind="launchpads-dataset"
        contents="The paid launchpads dataset adds daily fee, revenue and supply-side rows per venue, the fee policy with exclusion reasons, every indexed-activity observation with its window, and fee-model sources."
      />
    </Container>
  );
}
