"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Container } from "@/components/layout/container";

const LINKS: [string, string][] = [
  ["Methodology", "/methodology"],
  ["Sources", "/sources"],
  ["API", "/api"],
  ["RSS", "/research/feed.xml"],
];

/**
 * The shared footer: the disclaimer and the method links a reader looks for at the end of a page. The overview
 * renders its own footer (with the lambo), so this one stays off "/".
 */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <footer className="mt-20 border-t border-line">
      <Container className="flex flex-col gap-3 py-6 text-xs text-med sm:flex-row sm:items-center sm:justify-between">
        <p>LAMBLE publishes research on the crypto trenches, not investment advice.</p>
        <ul className="-my-2 flex flex-wrap gap-x-4">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              {/* The feed is a route handler, not a page: a plain link, no prefetch. */}
              {href.endsWith(".xml") ? (
                <a href={href} className="inline-block py-2 transition-colors duration-150 hover:text-high">
                  {label}
                </a>
              ) : (
                <Link href={href} className="inline-block py-2 transition-colors duration-150 hover:text-high">
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
