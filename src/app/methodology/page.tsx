import { readFileSync } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { formatValue } from "@/components/research/measure";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { Badge } from "@/components/ui/badge";
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

/** Renders a method document generically: the JSON in docs/methods is the single source for code and page. */
function Value({ v, depth }: { v: Json; depth: number }): ReactNode {
  if (v === null) return <span className="text-low">none</span>;
  if (typeof v === "string") return <span className="whitespace-pre-line">{v}</span>;
  if (typeof v === "number" || typeof v === "boolean") return <code className="font-mono text-high">{String(v)}</code>;
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === "string" || typeof x === "number")) return <span>{v.join(", ")}</span>;
    return (
      <ul className="flex flex-col gap-3">
        {v.map((x, i) => (
          <li key={i} className="rounded-lg bg-surface-2 p-3">
            <Value v={x} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dl className={depth === 0 ? "flex flex-col gap-4" : "flex flex-col gap-2"}>
      {Object.entries(v).map(([k, x]) => (
        <div key={k} className={depth === 0 ? "" : "grid gap-1 md:grid-cols-[12rem_1fr]"}>
          <dt className={depth === 0 ? "mb-1 text-xs font-semibold text-high" : "text-2xs font-medium text-med"}>{humanize(k)}</dt>
          <dd className="text-xs leading-relaxed text-med">
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

export default function MethodologyPage() {
  const { data, manifest } = loadRelease();
  const docs = DOCS.map((d) => ({ ...d, doc: readDoc(d.file) }));
  const evaluation = data.evaluation as Evaluation;
  return (
    <Container>
      <PageHeader
        eyebrow="Method"
        title="Methodology"
        description={<p>Every figure on this site comes from a versioned method applied to observations that were available at the time. The documents below are the same files the code reads; a method change bumps its version and earlier outputs keep the version they were computed with.</p>}
        meta={
          <span>
            Methods in release {data.releaseId}: {Object.entries(manifest.methodVersions).map(([k, v]) => `${k} ${v}`).join(" · ")}
          </span>
        }
      />
      <nav aria-label="On this page" className="mb-4 flex flex-wrap gap-2 text-xs">
        {[["states", "Data states"], ...docs.map((d) => [d.id, d.title]), ["evaluation", "Forward evaluation"]].map(([id, t]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line-med px-3 py-1 text-med hover:text-high">
            {t}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-4 pb-8">
        <Panel id="states" title="Data states and time">
          <dl className="grid gap-3 text-xs leading-relaxed text-med md:grid-cols-2">
            {[
              ["Observed", "Read from a source by a validated capability, with its own as-of time."],
              ["Derived", "Computed by a published method from observed values; the inputs are in the bundle."],
              ["Stale", "A value older than its maximum age at the release cutoff. Shown with its age, never refreshed silently."],
              ["Insufficient data", "The method applies but its inputs are incomplete. Never shown as zero."],
              ["Unavailable", "No validated, enabled capability provides the input. Never shown as zero."],
              ["Not applicable", "The measure does not apply (for example the bottoming test outside a drawdown)."],
              ["Availability time", "When an observation was first committed to the research record. Historical views use only observations available at their cutoff, so later data never rewrites what was known."],
              ["Releases", "Each release is immutable and content-addressed; the website and the API read the same release. A correction is a new release, and weekly editions get a new revision."],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold text-high">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        {docs.map((d) => (
          <Panel
            key={d.id}
            id={d.id}
            title={d.title}
            aside={
              <span className="flex items-center gap-2">
                <Badge variant="outline">{String(d.doc.version)}</Badge>
                <Badge variant={d.doc.status === "active" ? "positive" : "neutral"}>{String(d.doc.status)}</Badge>
              </span>
            }
          >
            <Value v={Object.fromEntries(Object.entries(d.doc).filter(([k]) => !["method", "version", "status"].includes(k)))} depth={0} />
          </Panel>
        ))}
        <Panel id="evaluation" title="Forward evaluation" description={`Harness ${evaluation.version}. Signals are scored only after their horizon passes, net of a ${formatValue(100 * (evaluation.assumptions.roundTripCost ?? 0), "percent")} round-trip cost, against a naive baseline. A claim needs at least 30 outcomes.`}>
          <p className="text-sm text-high">{evaluation.signals} bottoming signal(s) at stage 1 or higher so far.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {evaluation.horizons.map((h) => {
              const base = Object.entries(h.baselines)[0];
              return (
                <li key={h.horizonSeconds} className="rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-med">
                  <p className="font-semibold text-high">Horizon {h.horizonSeconds / 86_400} day(s)</p>
                  <p className="mt-1">{h.claim}</p>
                  {base && (
                    <p className="mt-1">
                      Baseline &ldquo;{base[0]}&rdquo;: n={base[1].n}, median net return {formatValue(base[1].medianNetReturn === null ? null : 100 * base[1].medianNetReturn, "signed-percent")}, failure rate{" "}
                      {formatValue(base[1].failureRate === null ? null : 100 * base[1].failureRate, "percent")} (confidence {base[1].confidence}).
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <Note className="mt-3">
            None of these figures is a forecast or a recommendation. The bottoming test describes what has been observed in a drawdown; see{" "}
            <Link href="/sources" className="text-link hover:underline">
              sources
            </Link>{" "}
            for which inputs exist today.
          </Note>
        </Panel>
      </div>
    </Container>
  );
}
