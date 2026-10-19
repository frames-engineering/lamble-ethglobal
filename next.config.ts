import type { NextConfig } from "next";

/**
 * Published research is read from files at request time by dynamic routes (uncovered coin pages, filtered
 * listings, the API). Trace exactly the published artifacts into server bundles; never the pipeline database,
 * staging or locks.
 */
const RESEARCH_FILES = [
  "./data/releases/**/*",
  "./data/editions/**/*",
  "./data/changes/**/*",
  "./content/research/**/*",
  "./docs/methods/*.json",
  "./docs/data/providers.json",
  "./docs/data/pricing.json",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/*": RESEARCH_FILES },
  outputFileTracingExcludes: { "/*": ["./data/*.sqlite*", "./data/staging/**/*", "./data/locks/**/*", "./data/runs/**/*"] },
};

export default nextConfig;
