import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/research/panel";

export default function NotFound() {
  return (
    <Container>
      <PageHeader title="Not found" description={<p>There is no page at this address. Coins are addressed by chain and canonical address, for example /coins/solana/&lt;mint&gt;.</p>} />
      <ul className="flex flex-wrap gap-3 pb-16 text-sm">
        {(
          [
            ["/coins", "Coins"],
            ["/narratives", "Narratives"],
            ["/market", "Market"],
            ["/research", "Research"],
          ] as const
        ).map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-link hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
