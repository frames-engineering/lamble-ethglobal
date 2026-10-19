import type { Metadata } from "next";

import { LaunchpadsTable } from "@/components/launchpads/launchpads-table";
import { Container } from "@/components/layout/container";
import { AgentAccess } from "@/components/research/agent-access";
import { formatValue } from "@/components/research/measure";
import { Note, PageHeader } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { apiPaths } from "@/lib/lambo/api/paths";
import { toLaunchpadView } from "@/lib/lambo/site/launchpads";
import { loadRelease } from "@/lib/lambo/service";

export const metadata: Metadata = {
  title: "Launchpads",
  description: "Launchpad economics: fees, revenue and creator earnings per venue from DefiLlama, provider-indexed launch activity, fee models, and which tracked coins and narratives each venue originated.",
  alternates: { canonical: "/launchpads" },
};

export default function LaunchpadsPage() {
  const { data } = loadRelease();
  const views = data.launchpads.map(toLaunchpadView);
  return (
    <>
      <Container>
        <PageHeader
          eyebrow="Research"
          title="Launchpads"
          description={
            <p>
              {data.launchpads.length} venues. Fees, revenue and creator earnings are DefiLlama values for settled UTC days to {formatDate(data.market.feeSubtotal.anchor)}; launch counts are Codex beta indexed rolling windows. Select a row for the summary, or open the research page for its full history.
            </p>
          }
          meta={
            <>
              <span>Fee subtotal, last settled day: {formatValue(data.market.feeSubtotal.value, "usd")}</span>
              <span>Data cutoff {formatDateTime(data.dataCutoff)}</span>
            </>
          }
        />
      </Container>
      <div className="mx-auto max-w-7xl xs:px-4 md:px-8">
        <LaunchpadsTable launchpads={views} />
      </div>
      <Container>
        <div className="flex flex-col gap-4 py-8">
          <Note>
            Five venues share fee streams with another venue and are excluded from the market subtotal; their own figures are shown here unchanged. &ldquo;Graduation&rdquo; columns show indexed completions over indexed creations in the same rolling window: a period ratio, not the probability that a coin graduates.
          </Note>
          <AgentAccess
            subject="launchpad economics across all tracked venues"
            discoveryPath={apiPaths.launchpads()}
            paidPath={apiPaths.launchpadsDataset()}
            kind="launchpads-dataset"
            contents="The paid launchpads dataset adds daily fee, revenue and supply-side rows per venue, the fee policy with exclusion reasons, every indexed-activity observation with its window, and fee-model sources."
          />
        </div>
      </Container>
    </>
  );
}
