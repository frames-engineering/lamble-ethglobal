"use client";

import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/research/panel";

/**
 * Fallback for unexpected errors in a page. Production errors from the server carry only a digest (never the
 * message), which is shown so a report can be matched with the server log.
 */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Container>
      <PageHeader
        title="This page could not be shown"
        description={
          <p>
            Something failed while reading the published research. The last valid release is still being served; this is a problem with this page, not with the data.
            {error.digest && (
              <>
                {" "}
                Reference <code className="font-mono">{error.digest}</code>.
              </>
            )}
          </p>
        }
      />
      <div className="flex flex-wrap items-center gap-4 pb-16 text-sm">
        <button type="button" onClick={() => retry()} className="rounded-md border border-line-med px-3 py-1.5 text-high hover:bg-surface-2">
          Try again
        </button>
        <Link href="/" className="text-link hover:underline">
          Home
        </Link>
        <Link href="/api/v1/health" className="text-link hover:underline">
          Service health
        </Link>
      </div>
    </Container>
  );
}
