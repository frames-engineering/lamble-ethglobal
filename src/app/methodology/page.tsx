import { readFileSync } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { SectionTabs } from "@/components/layout/section-tabs";
import { formatValue } from "@/components/research/measure";
import { Note, PageHeader, Panel, Section } from "@/components/research/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { loadRelease } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How LAMBLE computes every published figure: the bottoming test, holder analysis, narrative analytics, weekly editions, data states, availability time and the forward-evaluation harness. Versioned method documents.",
  alternates: { canonical: "/methodology" },
};

const DOCS = [
  { id: "bottoming", file: "bottoming.v1.json", title: "Bottoming test" },
  { id: "holders", file: "holder-analysis.v1.json", title: "Holder analysis" },
  { id: "narratives", file: "narratives.v1.json", title: "Narratives" },
  { id: "weekly", file: "weekly.v1.json", title: "Weekly editions" },
] as const;

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function readDoc(file: string): Record<string, Json> {
  return JSON.parse(readFileSync(path.join(process.env.LAMBLE_ROOT ?? process.cwd(), "docs", "methods", file), "utf8"));
}

function humanize(key: string): string {
  return key
    .replace(/^\d+_/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** A definition table: term on the left (stacked on phones), its meaning on the right, hairlines between rows. */
function Defs({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col divide-y divide-line">{children}</dl>;
}

function Def({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-4 first:pt-0 last:pb-0 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6">
      <dt className="text-sm font-medium text-high">{term}</dt>
      <dd className="max-w-[72ch] min-w-0 text-sm leading-relaxed text-med">{children}</dd>
    </div>
  );
}

/**
 * Renders a method document generically: the JSON in docs/methods is the single source for code and page.
 * Top-level keys become a definition table; deeper objects nest under a hairline rule, lists of records
 * sit on dividers.
 */
function Value({ v, depth }: { v: Json; depth: number }): ReactNode {
  if (v === null) return <span className="text-low">none</span>;
  if (typeof v === "string") return <span className="whitespace-pre-line">{v}</span>;
  if (typeof v === "number" || typeof v === "boolean") return <code className="font-mono text-high">{String(v)}</code>;
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === "string" || typeof x === "number")) return <span>{v.join(", ")}</span>;
    return (
      <ul className="flex flex-col divide-y divide-line">
        {v.map((x, i) => (
          <li key={i} className="py-3 first:pt-0 last:pb-0">
            <Value v={x} depth={depth} />
          </li>
        ))}
      </ul>
    );
  }
  if (depth === 0) {
    return (
      <Defs>
        {Object.entries(v).map(([k, x]) => (
          <Def key={k} term={humanize(k)}>
            <Value v={x} depth={1} />
          </Def>
        ))}
      </Defs>
    );
  }
  return (
    <dl className={cn("flex flex-col gap-3", depth > 1 && "border-l border-line pl-3")}>
      {Object.entries(v).map(([k, x]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium text-high">{humanize(k)}</dt>
          <dd className="mt-0.5">
            <Value v={x} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface HorizonStats {
  n: number;
  distinctTokens: number;
  meanNetReturn: number | null;
  medianNetReturn: number | null;
  hitRate: number | null;
  failureRate: number | null;
  confidence: string;
}
interface Evaluation {
  version: string;
  assumptions: Record<string, number | null>;
  signals: number;
  horizons: { horizonSeconds: number; all: HorizonStats; baselines: Record<string, HorizonStats>; claim: string }[];
}

const STATES: [string, string][] = [
  ["Observed", "Read from a source by a validated capability, with its own as-of time."],
  ["Derived", "Computed by a published method from observed values; the inputs are in the bundle."],
  ["Stale", "A value older than its maximum age at the release cutoff. Shown with its age, never refreshed silently."],
  ["Insufficient data", "The method applies but its inputs are incomplete. Never shown as zero."],
  ["Unavailable", "No validated, enabled capability provides the input. Never shown as zero."],
  ["Not applicable", "The measure does not apply (for example the bottoming test outside a drawdown)."],
  ["Availability time", "When an observation was first committed to the research record. Historical views use only observations available at their cutoff, so later data never rewrites what was known."],
  ["Releases", "Each release is immutable and content-addressed; the website and the API read the same release. A correction is a new release, and weekly editions get a new revision."],
];

/** Keys the section header already shows (the method id is the section itself). */
const SHOWN_ABOVE = ["method", "version", "status"];

export default function MethodologyPage() {
  const { data, manifest } = loadRelease();
  const docs = DOCS.map((d) => ({ ...d, doc: readDoc(d.file) }));
  const evaluation = data.evaluation as Evaluation;
  const sections: [string, string][] = [["states", "Data states"], ...docs.map((d): [string, string] => [d.id, d.title]), ["evaluation", "Forward evaluation"]];
  return (
    <Container>
      <PageHeader
        title="Methodology"
        description={<p>Every figure on this site comes from a versioned method applied to observations that were available at the time. The documents below are the same files the code reads; a method change bumps its version and earlier outputs keep the version they were computed with.</p>}
        meta={
          <>
            <span>
              Methods in release <code className="font-mono">{data.releaseId}</code>
            </span>
            {Object.entries(manifest.methodVersions).map(([k, v]) => (
              <span key={k}>
                {k} <code className="font-mono">{v}</code>
              </span>
            ))}
          </>
        }
      />

      {/* A long page of four method documents: the tab row keeps them in reach and follows the scroll. */}
      <SectionTabs sections={sections} className="mt-8" />

      <Section id="states" title="Data states and time" description="The label every figure carries, and which observations a figure may use.">
        <Panel>
          <Defs>
            {STATES.map(([k, v]) => (
              <Def key={k} term={k}>
                {v}
              </Def>
            ))}
          </Defs>
        </Panel>
      </Section>

      {docs.map((d) => {
        // A plain-text summary becomes the section's lede; version and status sit beside the title.
        const summary = typeof d.doc.summary === "string" ? d.doc.summary : undefined;
        const shownAbove = summary ? [...SHOWN_ABOVE, "summary"] : SHOWN_ABOVE;
        return (
          <Section
            key={d.id}
            id={d.id}
            title={d.title}
            description={summary}
            aside={
              <span className="text-xs text-med">
                <code className="font-mono">{String(d.doc.version)}</code> · {String(d.doc.status)}
              </span>
            }
          >
            <Panel>
              <Value v={Object.fromEntries(Object.entries(d.doc).filter(([k]) => !shownAbove.includes(k)))} depth={0} />
            </Panel>
          </Section>
        );
      })}

      <Section
        id="evaluation"
        title="Forward evaluation"
        description={
          <>
            Harness <code className="font-mono">{evaluation.version}</code>. Signals are scored only after their horizon passes, net of a {formatValue(100 * (evaluation.assumptions.roundTripCost ?? 0), "percent")} round-trip cost, against a naive baseline. A claim needs at least 30 outcomes.
          </>
        }
      >
        <Panel>
          <p className="text-sm text-high">
            <span className="font-mono">{evaluation.signals}</span> bottoming signal(s) at stage 1 or higher so far.
          </p>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Horizon</TableHead>
                <TableHead>Claim</TableHead>
                <TableHead>Baseline</TableHead>
                <TableHead className="text-right">n</TableHead>
                <TableHead className="text-right">Median net return</TableHead>
                <TableHead className="text-right">Failure rate</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluation.horizons.map((h) => {
                const base = Object.entries(h.baselines)[0];
                return (
                  <TableRow key={h.horizonSeconds}>
                    <TableCell className="align-top">{h.horizonSeconds / 86_400} day(s)</TableCell>
                    <TableCell className="max-w-80 min-w-56 align-top whitespace-normal text-med">{h.claim}</TableCell>
                    <TableCell className="align-top text-med">{base ? `“${base[0]}”` : "—"}</TableCell>
                    <TableCell className="text-right align-top font-mono">{base ? base[1].n : "—"}</TableCell>
                    <TableCell className="text-right align-top font-mono">{base ? formatValue(base[1].medianNetReturn === null ? null : 100 * base[1].medianNetReturn, "signed-percent") : "—"}</TableCell>
                    <TableCell className="text-right align-top font-mono">{base ? formatValue(base[1].failureRate === null ? null : 100 * base[1].failureRate, "percent") : "—"}</TableCell>
                    <TableCell className="align-top text-med">{base ? base[1].confidence : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
        <Note className="mt-4">
          None of these figures is a forecast or a recommendation. The bottoming test describes what has been observed in a drawdown; see{" "}
          <Link href="/sources" className="text-link hover:underline">
            sources
          </Link>{" "}
          for which inputs exist today.
        </Note>
      </Section>
    </Container>
  );
}
