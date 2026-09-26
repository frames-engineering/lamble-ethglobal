import { SOURCE_GLYPH } from "@/components/narratives/labels";
import type { Signal } from "@/lib/data/types";
import { relativeTime } from "@/lib/format";

export function SignalList({ signals }: { signals: Signal[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {signals.map((s) => (
        <li key={s.id} className="flex gap-3">
          <span
            aria-hidden
            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] bg-surface-3 text-[10px] leading-none text-med"
          >
            {SOURCE_GLYPH[s.source]}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-med">
              {s.label} · {relativeTime(s.at)}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-high">{s.title}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
