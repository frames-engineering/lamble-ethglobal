"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { formatDateTime } from "@/components/research/time";

const SECTION: Record<string, string> = {
  coins: "Coins",
  narratives: "Narratives",
  launchpads: "Launchpads",
  market: "Market weeks",
  research: "Research",
  methodology: "Methodology",
  sources: "Sources & coverage",
  api: "API",
};

/** Names for a section's detail pages; a market week shows its id instead. */
const DETAIL: Record<string, string> = { coins: "Coin", narratives: "Narrative", launchpads: "Launchpad", research: "Article" };

/**
 * Desktop wayfinding: where you are, and how fresh the data is. Every page reads one daily release, so the
 * cutoff belongs on every page rather than in each header.
 */
export function TopBar({ cutoff }: { cutoff: string | null }) {
  const pathname = usePathname() ?? "/";
  const [section, detail] = pathname.split("/").filter(Boolean);
  const sectionLabel = section ? SECTION[section] : "Overview";
  let crumbs: ReactNode = <span className="text-high">{sectionLabel ?? "LAMBLE"}</span>;
  if (section && detail && sectionLabel) {
    crumbs = (
      <>
        <Link href={`/${section}`} className="transition-colors duration-150 hover:text-high">
          {sectionLabel}
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-high">{DETAIL[section] ?? decodeURIComponent(detail)}</span>
      </>
    );
  }
  return (
    <div className="hidden h-14 shrink-0 items-center justify-between gap-6 border-b border-line px-10 lg:flex">
      <nav aria-label="Breadcrumb" className="text-sm text-med">
        {crumbs}
      </nav>
      {cutoff && <p className="text-xs text-med">Data through {formatDateTime(cutoff)}</p>}
    </div>
  );
}
