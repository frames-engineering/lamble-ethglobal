import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { ExternalLink } from "@/components/research/links";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate } from "@/components/research/time";
import { PoweredByFrames } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadCatalog } from "@/lib/lamble/catalog/load";
import type { Capability } from "@/lib/lamble/catalog/catalog";
import { CHAIN_NAME } from "@/lib/lamble/core/identity";
import { loadRelease } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Sources and coverage",
  description: "Every data capability LAMBLE uses or evaluates, acquired through Frames: what it covers, which population it describes, its validation status, freshness and recorded usage rights.",
  alternates: { canonical: "/sources" },
};

const STATUS_ORDER = ["validated", "candidate", "blocked", "deprecated", "discovered"] as const;
const STATUS_VARIANT = { validated: "positive", candidate: "warning", blocked: "negative", deprecated: "neutral", discovered: "outline" } as const;

function RightsCell({ r }: { r: Capability["rights"] }) {
  return (
    <span className="flex flex-col gap-0.5 text-2xs text-med">
      <span>display: {r.display}</span>
      <span>redistribution: {r.redistribution}</span>
    </span>
  );
}

export default function SourcesPage() {
  const catalog = loadCatalog();
  const { data } = loadRelease();
  const caps = [...catalog.capabilities].sort((a, b) => STATUS_ORDER.indexOf(a.validation.status) - STATUS_ORDER.indexOf(b.validation.status) || a.key.localeCompare(b.key));
  const providers = new Map(catalog.providers.map((p) => [p.id, p]));
  const enabled = caps.filter((c) => c.enabled);
  return (
    <Container>
      <PageHeader
        eyebrow="Method"
        title="Sources and coverage"
        description={
          <div className="flex flex-col gap-3">
            <p>
              LAMBLE acquires data through Frames, which pays the sellers of each capability per call. Every capability below is registered in one catalog with its contract, population, freshness and recorded rights; only validated, enabled capabilities feed published research. Page views and API reads never call a provider.
            </p>
            <PoweredByFrames className="self-start" />
          </div>
        }
        meta={<span>Catalog updated {formatDate(catalog.updatedAt)} · {enabled.length} enabled of {caps.length} registered</span>}
      />
      <div className="flex flex-col gap-4 pb-8">
        <Panel title="Capabilities" description="Validated: descriptor verified, a live response retained and its field map checked. Candidate: descriptor verified, no response retained under an approved budget; never published. Blocked: tested and failed for a recorded reason.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capability</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Networks</TableHead>
                  <TableHead>Covers</TableHead>
                  <TableHead>Rights</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caps.map((c) => {
                  const p = providers.get(c.provider);
                  return (
                    <TableRow key={c.key}>
                      <TableCell className="align-top">
                        <code className="font-mono text-xs text-high">{c.key}</code>
                        {c.enabled && <span className="ml-2 text-2xs text-positive">enabled</span>}
                        {c.uses.length > 0 && <span className="mt-1 block max-w-56 text-2xs whitespace-normal text-low">{c.uses.join("; ")}</span>}
                      </TableCell>
                      <TableCell className="align-top text-xs">{p?.homepage ? <ExternalLink href={p.homepage}>{p.name}</ExternalLink> : (p?.name ?? c.provider)}</TableCell>
                      <TableCell className="align-top">
                        <Badge variant={STATUS_VARIANT[c.validation.status]}>{c.validation.status}</Badge>
                        {c.validation.reason && <span className="mt-1 block max-w-48 text-2xs whitespace-normal text-low">{c.validation.reason}</span>}
                      </TableCell>
                      <TableCell className="max-w-40 align-top text-2xs whitespace-normal text-med">{c.dataNetworks.map((n) => CHAIN_NAME[n] ?? n).join(", ") || "—"}</TableCell>
                      <TableCell className="max-w-md align-top text-2xs whitespace-normal text-med">
                        {c.semantics.population && <span className="mb-1 block text-high">Population: {c.semantics.population.replaceAll("_", " ")}</span>}
                        {c.semantics.coverage}
                      </TableCell>
                      <TableCell className="align-top">
                        <RightsCell r={c.rights} />
                      </TableCell>
                      <TableCell className="align-top text-2xs whitespace-nowrap text-med">{formatDate(c.validation.lastVerifiedAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Rights" description="Recorded per capability: storage, display, redistribution.">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-xs leading-relaxed text-med">
              <li>&ldquo;Unknown&rdquo; means the provider&apos;s terms have not been reviewed. Components derived from such a capability are withheld from paid API exports until the owner reviews the terms.</li>
              <li>Pages and posts found through search are cited by link with a paraphrase; their text is never redistributed.</li>
              <li>LAMBLE&apos;s own classifications, rationales and methods are its own work; linked evidence keeps its own rights.</li>
            </ul>
          </Panel>
          <Panel title="How a new source is added" description="The same steps for every provider; nothing is enabled by hand-editing code.">
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-xs leading-relaxed text-med">
              <li>Discover it with free Frames search and record it as discovered.</li>
              <li>Verify the descriptor and live 402 schema with free calls; record it as a candidate with its population and limits.</li>
              <li>Within an approved budget, retain one live response, write an adapter and verify its field map against that response.</li>
              <li>Validate the catalog (schema plus rules: an enabled capability needs a registered adapter and a verified field map), then enable it.</li>
              <li>Record rights after reviewing the provider&apos;s terms. Publication and paid export follow the recorded rights.</li>
            </ol>
          </Panel>
        </div>
        <Panel title="Coverage in the current release" description={`Release ${data.releaseId}.`}>
          <ul className="grid gap-2 text-xs md:grid-cols-2">
            {data.coverage.map((c) => (
              <li key={c.capability} className="rounded-lg bg-surface-2 p-3">
                <span className="flex items-center gap-2">
                  <code className="font-mono text-high">{c.capability}</code>
                  <Badge variant={c.enabled ? "positive" : "outline"}>{c.enabled ? "feeds this release" : c.status}</Badge>
                </span>
                <p className="mt-1 leading-relaxed text-med">{c.coverage}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Note>Holder panels from pump.fun and FOMO are samples (the largest positions a venue tracks, or the venue&apos;s own users) and are never presented as all-holder measures. Rolling provider windows are never summed into calendar periods.</Note>
      </div>
    </Container>
  );
}
