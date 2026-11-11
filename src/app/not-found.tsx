import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/research/panel";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container>
      <PageHeader
        title="Not found"
        description={
          <p>
            There is no page at this address. Coins are addressed by chain and canonical address, for example <code className="font-mono text-sm">/coins/solana/&lt;mint&gt;</code>.
          </p>
        }
      />
      <div className="mt-8">
        <Link href="/" className={buttonVariants()}>
          Back to Overview
        </Link>
      </div>
    </Container>
  );
}
