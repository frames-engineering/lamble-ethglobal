import { LetterMark } from "@/components/brand/letter-mark";
import { percent } from "@/lib/format";

export interface ShareItem {
  id: string;
  name: string;
  color: string;
  /** Optional local logo; falls back to the letter-mark. */
  src?: string;
  /** Share, percent. */
  share: number | null;
  explorerUrl?: string;
  shareLabel?: string;
}

/** Ranked rows: avatar, name, share. Used for top coins and top launchpads. */
export function ShareList({ items }: { items: ShareItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
          <LetterMark name={item.name} color={item.color} size={28} src={item.src} />
          {item.explorerUrl ? <a href={item.explorerUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm text-link underline">{item.name}</a> : <span className="min-w-0 flex-1 truncate text-sm text-high">{item.name}</span>}
          <span title={item.shareLabel} className="text-sm font-medium tabular-nums text-high">{percent(item.share, { digits: 0 })}</span>
        </li>
      ))}
    </ol>
  );
}
