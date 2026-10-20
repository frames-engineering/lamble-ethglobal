import Link from "next/link";

import { formatDateTime } from "@/components/research/time";
import type { ChangeEvent } from "@/lib/lamble/release/types";
import { changeHref } from "@/lib/lamble/service";

/** A short list of change events with links to the pages they concern. Summaries are generated text, not quotes. */
export function ChangeList({ events }: { events: ChangeEvent[] }) {
  if (!events.length) return <p className="text-xs text-med">No change recorded since the previous release.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {events.map((e) => {
        const href = changeHref(e);
        return (
          <li key={e.seq} className="text-xs leading-relaxed">
            <span className="mr-2 font-mono text-2xs text-low">{e.kind}</span>
            {href ? (
              <Link href={href} className="text-high hover:underline">
                {e.summary}
              </Link>
            ) : (
              <span className="text-high">{e.summary}</span>
            )}
            <span className="ml-2 text-2xs text-low">{formatDateTime(e.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
