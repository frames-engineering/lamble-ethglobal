"use client";

import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/research/panel";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Fallback for unexpected errors in a page. Production errors from the server carry only a digest (never the
 * message), which is shown so a report can be matched with the server log.
 */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Container>
      <PageHeader
        title="This page could not be shown"
        description={<p>Something failed while reading the published research. The last valid release is still being served; this is a problem with this page, not with the data.</p>}
        meta={
          error.digest && (
            <span>
              Reference <code className="font-mono">{error.digest}</code>
            </span>
          )
        }
      />
      <div className="mt-8 flex flex-wrap gap-2">
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to Overview
        </Link>
      </div>
    </Container>
  );
}
