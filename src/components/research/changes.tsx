import Link from "next/link";

import { formatDateTime } from "@/components/research/time";
import type { ChangeEvent } from "@/lib/lamble/release/types";
import { changeHref } from "@/lib/lamble/service";

/**
 * A short list of change events with links to the pages they concern: the summary first, then the event type
 * and time in small type. Summaries are generated text, not quotes.
 */
export function ChangeList({ events }: { events: ChangeEvent[] }) {
  if (!events.length) return <p className="text-sm text-med">No change recorded since the previous release.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {events.map((e) => {
        const href = changeHref(e);
        return (
          <li key={e.seq} className="flex flex-col gap-0.5 py-2.5 text-sm first:pt-0 last:pb-0">
            {href ? (
              <Link href={href} className="text-high hover:underline">
                {e.summary}
              </Link>
            ) : (
              <span className="text-high">{e.summary}</span>
            )}
            <span className="text-xs text-med">
              <span className="font-mono">{e.kind}</span> · {formatDateTime(e.at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
