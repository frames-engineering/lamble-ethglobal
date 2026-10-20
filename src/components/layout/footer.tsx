import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { PoweredByFrames } from "@/components/layout/site-header";
import { LAUNCH_BOT_URL } from "@/lib/links";

const COLUMNS = [
  { title: "Research", links: [["Coins", "/coins"], ["Narratives", "/narratives"], ["Market weeks", "/market"], ["Articles", "/research"], ["Launchpads", "/launchpads"]] },
  { title: "Method", links: [["Methodology", "/methodology"], ["Sources & coverage", "/sources"], ["Changes feed", "/api#changes"], ["RSS", "/research/feed.xml"]] },
  { title: "Agents", links: [["API & Frames setup", "/api"], ["OpenAPI", "/api/v1/openapi.json"], ["llms.txt", "/llms.txt"]] },
] as const;

/** Footer: link columns, attribution, and the wordmark edge to edge as before. */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-divider pt-10">
      <Container>
        <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col items-start gap-3">
            <p className="max-w-sm text-sm leading-relaxed text-med">
              Research on the crypto trenches: coins, narratives, launchpads and weekly market editions, computed from retained evidence. Not investment advice.
            </p>
            <PoweredByFrames />
            <a href={LAUNCH_BOT_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-med underline-offset-4 hover:text-high hover:underline">
              Launching a token? The LAMBLE launch bot (Telegram)
            </a>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-2xs font-medium tracking-widest text-med uppercase">{c.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    {/* Feeds, OpenAPI and llms.txt are route handlers, not pages: plain links, no prefetch. */}
                    {/\.(xml|json|txt)$/.test(href) ? (
                      <a href={href} className="text-sm text-med hover:text-high">
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="text-sm text-med hover:text-high">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
      <div className="px-4 pt-10 pb-4 md:px-8 md:pb-8">
        <Logo className="h-auto w-full" />
      </div>
    </footer>
  );
}
