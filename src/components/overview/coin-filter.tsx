"use client";

import { type ReactNode, useState } from "react";

import { Segmented } from "@/components/ui/segmented";

/**
 * Just spotted's coin categories. The server renders one finished table per view; this only picks which one shows,
 * so no formatting code ships to the browser. The switch scrolls in its own row so it never widens a phone page.
 */
export function CoinFilter({ views }: { views: { id: string; label: string; count: number; table: ReactNode }[] }) {
  const [value, setValue] = useState(views[0]?.id ?? "");
  // The count sits in a quiet badge so the category name leads.
  const options = views.map((v) => [v.id, <>{v.label}<span className="rounded-xs bg-surface-3 px-1 font-mono text-[11px] leading-4 text-med tabular-nums">{v.count}</span></>] as const);
  return (
    <>
      <div className="mt-3 overflow-x-auto overscroll-x-contain scrollbar-none">
        <Segmented label="Coin status" options={options} value={value} onChange={setValue} />
      </div>
      {views.find((v) => v.id === value)?.table}
    </>
  );
}
