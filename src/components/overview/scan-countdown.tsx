"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";

// A second clock that ticks on second boundaries. The server snapshot is null, so the server render and the first
// client render agree and hydration never sees a clock mismatch (as in scout-freshness and the status bar).
function subscribe(onChange: () => void) {
  let id: ReturnType<typeof setTimeout>;
  const tick = () => {
    onChange();
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  id = setTimeout(tick, 1000 - (Date.now() % 1000));
  return () => clearTimeout(id);
}
const second = () => Math.floor(Date.now() / 1000) * 1000;

/** How long after the expected scan the section still says a scan is under way: runs land at about :17 and deploy 4–8 minutes later. */
const SCANNING_MS = 15 * 60_000;
const SCAN_TIME = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Just spotted's header: a countdown to the next hourly scan, then "Scanning now" while one is due, "Scan overdue" when
 * a run is late (runs do skip hours), and the last scan's time once the finds are older than `staleSeconds` (the
 * section shows its paused note by then). The page is static, so a new scan only shows after a reload.
 */
export function ScanCountdown({ generatedAt, intervalSeconds, staleSeconds }: { generatedAt: string; intervalSeconds: number; staleSeconds: number }) {
  const now = useSyncExternalStore(subscribe, second, () => null);
  const scan = Date.parse(generatedAt);
  const last = `${SCAN_TIME.format(scan)} UTC`;
  const late = now === null ? null : now - (scan + intervalSeconds * 1000);

  if (now !== null && now - scan > staleSeconds * 1000) return <span className="text-xs text-med">Last scan {last}</span>;

  const status =
    late === null || late < 0 ? (
      <span>
        New scan in{" "}
        <span className="font-mono text-high tabular-nums">{late === null ? "--:--" : clock(Math.min(-late, intervalSeconds * 1000))}</span>
      </span>
    ) : late < SCANNING_MS ? (
      <span className="flex items-center gap-1.5 text-high">
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-positive opacity-60 motion-reduce:hidden" />
          <span className="relative size-1.5 rounded-full bg-positive" />
        </span>
        Scanning now
      </span>
    ) : (
      <span className="text-high">Scan overdue</span>
    );

  return (
    <span className="flex items-center gap-3 text-xs text-med">
      <InfoTip label={`Last scan ${last}`} trigger={status}>
        Last scan {last}. Scans run about hourly; the page shows a new one after it deploys and you reload.
      </InfoTip>
      {late !== null && late >= 0 && (
        <Button variant="link" size="sm" className="text-xs" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      )}
    </span>
  );
}
