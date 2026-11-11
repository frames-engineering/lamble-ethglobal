import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { ExternalLink } from "@/components/research/links";
import { Note, PageHeader, Panel, Section } from "@/components/research/panel";
import { formatDate } from "@/components/research/time";
import { PoweredByFrames } from "@/components/brand/powered-by-frames";
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
    <span className="flex flex-col gap-0.5 text-xs text-med">
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
          <p>
            LAMBLE acquires data through Frames, which pays the sellers of each capability per call. Every capability below is registered in one catalog with its contract, population, freshness and recorded rights; only validated, enabled capabilities feed published research. Page views and API reads never call a provider.
          </p>
        }
        actions={<PoweredByFrames />}
        meta={
          <>
            <span>Catalog updated {formatDate(catalog.updatedAt)}</span>
            <span>
              <span className="font-mono">{enabled.length}</span> enabled of <span className="font-mono">{caps.length}</span> registered
            </span>
          </>
        }
      />

      <Section
        id="capabilities"
        title="Capabilities"
        description="Validated: descriptor verified, a live response retained and its field map checked. Candidate: descriptor verified, no response retained under an approved budget; never published. Blocked: tested and failed for a recorded reason."
      >
        <Panel>
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
                      <code className="font-mono text-high">{c.key}</code>
                      {c.enabled && <span className="ml-2 text-xs text-positive">enabled</span>}
                      {c.uses.length > 0 && <span className="mt-1 block max-w-56 text-xs whitespace-normal text-low">{c.uses.join("; ")}</span>}
                    </TableCell>
                    <TableCell className="align-top">{p?.homepage ? <ExternalLink href={p.homepage}>{p.name}</ExternalLink> : (p?.name ?? c.provider)}</TableCell>
                    <TableCell className="align-top">
                      <Badge variant={STATUS_VARIANT[c.validation.status]}>{c.validation.status}</Badge>
                      {c.validation.reason && <span className="mt-1 block max-w-48 text-xs whitespace-normal text-low">{c.validation.reason}</span>}
                    </TableCell>
                    <TableCell className="max-w-40 align-top text-xs whitespace-normal text-med">{c.dataNetworks.map((n) => CHAIN_NAME[n] ?? n).join(", ") || "—"}</TableCell>
                    <TableCell className="max-w-md min-w-64 align-top text-xs leading-relaxed whitespace-normal text-med">
                      {c.semantics.population && <span className="mb-1 block text-high">Population: {c.semantics.population.replaceAll("_", " ")}</span>}
                      {c.semantics.coverage}
                    </TableCell>
                    <TableCell className="align-top">
                      <RightsCell r={c.rights} />
                    </TableCell>
                    <TableCell className="align-top text-xs text-med">{formatDate(c.validation.lastVerifiedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      </Section>

      <Section id="coverage" title="Coverage in the current release" description={<>What each capability covers in release <code className="font-mono">{data.releaseId}</code>.</>}>
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Capability</TableHead>
                <TableHead>In this release</TableHead>
                <TableHead>Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.coverage.map((c) => (
                <TableRow key={c.capability}>
                  <TableCell className="align-top">
                    <code className="font-mono text-high">{c.capability}</code>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={c.enabled ? "positive" : "outline"}>{c.enabled ? "feeds this release" : c.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xl min-w-64 align-top text-xs leading-relaxed whitespace-normal text-med">{c.coverage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <Note className="mt-4">Holder panels from pump.fun and FOMO are samples (the largest positions a venue tracks, or the venue&apos;s own users) and are never presented as all-holder measures. Rolling provider windows are never summed into calendar periods.</Note>
      </Section>

      <Section id="rights" title="Rights" description="Recorded per capability: storage, display, redistribution.">
        <ul className="flex max-w-[72ch] list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-med marker:text-low">
          <li>&ldquo;Unknown&rdquo; means the provider&apos;s terms have not been reviewed. Components derived from such a capability are withheld from paid API exports until the owner reviews the terms.</li>
          <li>Pages and posts found through search are cited by link with a paraphrase; their text is never redistributed.</li>
          <li>LAMBLE&apos;s own classifications, rationales and methods are its own work; linked evidence keeps its own rights.</li>
        </ul>
      </Section>

      <Section id="adding" title="How a new source is added" description="The same steps for every provider; nothing is enabled by hand-editing code.">
        <ol className="flex max-w-[72ch] list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-med marker:font-mono marker:text-low">
          <li>Discover it with free Frames search and record it as discovered.</li>
          <li>Verify the descriptor and live 402 schema with free calls; record it as a candidate with its population and limits.</li>
          <li>Within an approved budget, retain one live response, write an adapter and verify its field map against that response.</li>
          <li>Validate the catalog (schema plus rules: an enabled capability needs a registered adapter and a verified field map), then enable it.</li>
          <li>Record rights after reviewing the provider&apos;s terms. Publication and paid export follow the recorded rights.</li>
        </ol>
      </Section>
    </Container>
  );
}
