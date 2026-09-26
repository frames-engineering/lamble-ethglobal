import { LetterMark } from "@/components/brand/letter-mark";
import { percent } from "@/lib/format";

export interface ShareItem {
  id: string;
  name: string;
  color: string;
  /** Optional local logo; falls back to the letter-mark. */
  src?: string;
  /** Share, percent. */
  share: number;
}

/**
 * Ranked rows: avatar, name, share. Used for top coins and top launchpads, sized like the
 * screener's rows: 57px with 1px dividers, 34px avatar, 14px name, 13px tabular value.
 */
export function ShareList({ items }: { items: ShareItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="flex h-[57px] items-center gap-3 border-b border-line last:border-0">
          <LetterMark name={item.name} color={item.color} size={34} src={item.src} />
          <span className="min-w-0 flex-1 truncate text-sm text-high">{item.name}</span>
          <span className="text-[13px] tabular-nums text-high">{percent(item.share, { digits: 0 })}</span>
        </li>
      ))}
    </ol>
  );
}
