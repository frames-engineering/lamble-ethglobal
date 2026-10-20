/**
 * Export rights gate for paid bundles. Each bundle section names the capabilities its values derive from; a
 * section is exportable only when every one of them records redistribution "permitted" in the provider catalog
 * (docs/data/providers.json). Unknown or prohibited rights withhold the section, and a bundle whose primary
 * sections are withheld is not offered for sale at all: no 402, no payment.
 *
 * Changing a capability's rights after the owner reviews the provider's terms is the only way to open a section.
 */
import type { Catalog } from "../catalog/catalog.ts";
import type { ResourceKind } from "../payments/pricing.ts";

export interface SectionSpec {
  /** Capabilities whose data the section contains or is computed from. */
  sources: string[];
  /** A bundle is sellable only when all its primary sections are exportable. */
  primary: boolean;
  description: string;
}

const MARKET = ["codex.token-snapshot"];
const BARS = ["codex.token-bars"];
const METADATA = ["codex.token-metadata", "codex.token-discovery"];
const CURATION = ["lamble.curation"];
const FEES = ["defillama.fees"];
const ACTIVITY = ["codex.launchpad-activity"];

export const BUNDLE_SECTIONS: Record<ResourceKind, Record<string, SectionSpec>> = {
  "coin-bundle": {
    market: { sources: MARKET, primary: true, description: "Latest market measures with provenance" },
    series: { sources: [...MARKET, ...BARS], primary: true, description: "Observation-level price, market cap, liquidity and volume series" },
    holders: { sources: MARKET, primary: false, description: "Holder-analysis components with inputs and histories" },
    bottoming: { sources: [...MARKET, ...BARS], primary: false, description: "Every bottoming evaluation, episodes and conditions" },
    peers: { sources: MARKET, primary: false, description: "Peer set and returns" },
    metadata: { sources: METADATA, primary: false, description: "Names, creation time and origin attribution" },
    memberships: { sources: CURATION, primary: false, description: "Narrative membership intervals with rationale and evidence links" },
  },
  "coin-history": {
    series: { sources: [...MARKET, ...BARS], primary: true, description: "Full retained observation history with revisions" },
    memberships: { sources: CURATION, primary: false, description: "Membership intervals" },
  },
  "narrative-bundle": {
    memberships: { sources: CURATION, primary: true, description: "Every membership interval with rationale, basis and evidence links" },
    versions: { sources: CURATION, primary: true, description: "Title, summary and story versions with availability times" },
    lifecycle: { sources: CURATION, primary: true, description: "Collection lifecycle records with reasons" },
    memberSeries: { sources: BARS, primary: false, description: "Hourly and daily volume per member" },
    activity: { sources: BARS, primary: false, description: "Narrative volume measures" },
  },
  "week-dataset": {
    fees: { sources: FEES, primary: true, description: "Venue fee, revenue and creator-earnings rows for the week and comparison week" },
    narratives: { sources: [...BARS, ...CURATION], primary: true, description: "Narrative totals and per-token weekly rows in all three historical modes" },
    indexedActivity: { sources: ACTIVITY, primary: false, description: "Indexed launch activity in its own rolling window" },
    editorial: { sources: CURATION, primary: false, description: "Checks, watch list, revisions and provenance" },
    signals: { sources: [...MARKET, ...BARS], primary: false, description: "Bottoming transitions and liquidity-to-size changes over the week" },
  },
  "launchpads-dataset": {
    fees: { sources: FEES, primary: true, description: "Daily fee, revenue and supply-side rows per venue" },
    indexedActivity: { sources: ACTIVITY, primary: false, description: "Every indexed-activity observation with its window" },
    policy: { sources: CURATION, primary: false, description: "Fee policy with exclusion reasons and fee-model sources" },
  },
  "research-article": {
    article: { sources: CURATION, primary: true, description: "Article text, structure, review status and citations" },
    citedValues: { sources: [...MARKET, ...BARS, ...FEES, ...ACTIVITY], primary: false, description: "Every cited release value resolved" },
  },
};

export interface SectionDecision {
  exportable: boolean;
  sources: string[];
  /** Capabilities whose rights withhold the section, with their recorded redistribution value. */
  blockedBy: { capability: string; redistribution: string }[];
  description: string;
  primary: boolean;
}

export interface ExportPlan {
  kind: ResourceKind;
  sellable: boolean;
  sections: Record<string, SectionDecision>;
  /** Distinct capabilities withholding at least one section. */
  blockedBy: string[];
  note: string;
}

export function exportPlan(kind: ResourceKind, catalog: Catalog): ExportPlan {
  const caps = new Map(catalog.capabilities.map((c) => [c.key, c]));
  const sections: Record<string, SectionDecision> = {};
  for (const [name, spec] of Object.entries(BUNDLE_SECTIONS[kind])) {
    const blockedBy = spec.sources
      .map((key) => ({ capability: key, redistribution: caps.get(key)?.rights.redistribution ?? "unregistered" }))
      .filter((x) => x.redistribution !== "permitted");
    sections[name] = { exportable: blockedBy.length === 0, sources: spec.sources, blockedBy, description: spec.description, primary: spec.primary };
  }
  const sellable = Object.values(sections).every((s) => !s.primary || s.exportable);
  const blockedBy = [...new Set(Object.values(sections).flatMap((s) => s.blockedBy.map((b) => b.capability)))].sort();
  return {
    kind,
    sellable,
    sections,
    blockedBy,
    note: sellable
      ? blockedBy.length
        ? `Sections derived from ${blockedBy.join(", ")} are withheld until the provider's terms are reviewed and redistribution is recorded as permitted.`
        : "Every section is exportable."
      : `Not offered for sale: its primary content derives from ${blockedBy.join(", ")}, whose redistribution rights are not recorded as permitted. The owner must review those providers' terms first.`,
  };
}

/** Replaces withheld sections with an explicit marker; never drops a section silently. */
export function applyPlan<T extends Record<string, unknown>>(plan: ExportPlan, sections: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(sections)) {
    const d = plan.sections[name];
    if (!d) throw new Error(`Section ${name} is not declared for ${plan.kind}; declare its sources in BUNDLE_SECTIONS.`);
    out[name] = d.exportable ? value : { withheld: true, reason: "redistribution_rights_not_permitted", blockedBy: d.blockedBy };
  }
  for (const name of Object.keys(plan.sections)) if (!(name in out)) throw new Error(`Section ${name} of ${plan.kind} was not rendered.`);
  return out;
}
