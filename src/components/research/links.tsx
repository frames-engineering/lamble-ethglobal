import Link from "next/link";

import { ChainMark } from "@/components/brand/chain-mark";
import { Badge } from "@/components/ui/badge";
import type { ChainId } from "@/lib/data/types";
import type { Evidence } from "@/lib/lamble/release/types";
import { cn } from "@/lib/utils";

export function coinHref(chain: string, address: string) {
  return `/coins/${chain}/${address}`;
}

export function CoinLabel({
  chain,
  address,
  symbol,
  name,
  className,
  link = true,
}: {
  chain: string;
  address: string;
  symbol: string | null;
  name?: string | null;
  className?: string;
  link?: boolean;
}) {
  const body = (
    <>
      <ChainMark chain={chain as ChainId} size={16} />
      <span className="truncate font-medium text-high">{symbol ?? `${address.slice(0, 6)}…`}</span>
      {name && name !== symbol && <span className="truncate text-xs text-med">{name}</span>}
    </>
  );
  return link ? (
    <Link href={coinHref(chain, address)} className={cn("inline-flex min-w-0 items-center gap-2 rounded hover:underline focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none", className)}>
      {body}
    </Link>
  ) : (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>{body}</span>
  );
}

/** Short address with the full value in the title; the canonical address is always available to copy. */
export function Address({ value, className }: { value: string; className?: string }) {
  return (
    <code title={value} className={cn("rounded bg-surface-2 px-1.5 py-0.5 font-mono text-2xs break-all text-med", className)}>
      {value}
    </code>
  );
}

/** External links are rendered only for https URLs the release already validated; rel="noopener noreferrer nofollow". */
export function ExternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  let safe = false;
  try {
    safe = new URL(href).protocol === "https:";
  } catch {
    safe = false;
  }
  if (!safe) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cn("text-link hover:underline", className)}>
      {children}
    </a>
  );
}

const KIND_LABEL: Record<Evidence["kind"], string> = {
  "frames-call": "Frames data",
  "x-post": "X post",
  page: "Page",
  "curated-source": "Source",
  legacy: "Source",
};

export function EvidenceItem({ evidence }: { evidence: Evidence }) {
  return (
    <li className="flex min-w-0 gap-2 text-xs leading-relaxed">
      <Badge variant="neutral" className="mt-0.5">
        {KIND_LABEL[evidence.kind]}
      </Badge>
      <span className="min-w-0 text-med">
        {evidence.url ? <ExternalLink href={evidence.url}>{evidence.label}</ExternalLink> : <span className="text-high">{evidence.label}</span>}
        {evidence.at && <span className="ml-1 text-low">· {evidence.at.slice(0, 10)}</span>}
      </span>
    </li>
  );
}

export function EvidenceList({ ids, index, limit = 8 }: { ids: string[]; index: Record<string, Evidence>; limit?: number }) {
  const items = [...new Set(ids)].map((id) => index[id]).filter((e): e is Evidence => Boolean(e));
  if (!items.length) return <p className="text-xs text-med">No citable evidence recorded.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.slice(0, limit).map((e) => (
        <EvidenceItem key={e.id} evidence={e} />
      ))}
      {items.length > limit && <li className="text-2xs text-med">+{items.length - limit} more in the API bundle.</li>}
    </ul>
  );
}
