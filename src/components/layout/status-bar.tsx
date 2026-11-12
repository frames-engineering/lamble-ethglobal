"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { FramesMark } from "@/components/brand/frames-mark";
import { useMounted } from "@/hooks/use-mounted";
import { FRAMES_URL, TELEGRAM_URL, X_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

/** A release is "live" while it is younger than this. */
const LIVE_MS = 12 * 3_600_000;
/** The daily refresh: the next release is expected one day after the current cutoff. */
const CADENCE_MS = 24 * 3_600_000;

// A minute clock shared by every reader. The server snapshot is null, so relative times only render on the
// client and hydration never sees a clock mismatch.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}
const minute = () => Math.floor(Date.now() / 60_000) * 60_000;

function span(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return `${h} ${h === 1 ? "hour" : "hours"}`;
}

/**
 * The fixed bar along the bottom of every page: how fresh the release is and when the next one lands, then the
 * theme and the Frames credit. Every page reads the same daily release, so its age belongs here once rather
 * than in each page header.
 */
export function StatusBar({ cutoff }: { cutoff: string | null }) {
  const now = useSyncExternalStore(subscribe, minute, () => null);
  const cut = cutoff ? new Date(cutoff).getTime() : NaN;
  const known = Number.isFinite(cut);
  const age = now !== null && known ? now - cut : null;
  const live = age !== null && age < LIVE_MS;
  const untilNext = now !== null && known ? cut + CADENCE_MS - now : null;

  return (
    // Desktop: pinned, starting where the 240px sidebar ends (lg:left-60) so it only spans the content column.
    // Below lg it is an ordinary strip at the end of the page that wraps instead of truncating, so it never
    // squeezes a phone screen. Its bottom padding clears the home indicator either way.
    <footer className="z-30 flex items-center justify-between gap-x-4 border-t border-line bg-background px-3 text-xs text-med max-lg:min-h-11 max-lg:flex-wrap max-lg:gap-y-2 max-lg:pt-2 max-lg:pb-[calc(0.5rem+var(--safe-b))] lg:fixed lg:right-0 lg:bottom-0 lg:left-60 lg:h-(--status-h) lg:px-4 lg:pb-(--safe-b)">
      <div className="flex min-w-0 items-center gap-4 self-stretch tabular-nums">
        {live && (
          // The dot alone says it; the word stays for screen readers. It sits a step closer to the text it qualifies.
          <span className="-mr-2 flex items-center">
            <span aria-hidden className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-positive opacity-60 motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-positive" />
            </span>
            <span className="sr-only">Live</span>
          </span>
        )}
        {age !== null && <p className="truncate text-high">Updated {span(age)} ago</p>}
        {untilNext !== null && (
          <>
            {/* Dividers run the bar's full height, meeting its top rule. */}
            <span aria-hidden className="hidden w-px self-stretch bg-line sm:block" />
            <p className="hidden truncate sm:block">{untilNext > 0 ? `Next update in ${span(untilNext)}` : "Next update soon"}</p>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4 self-stretch">
        <div className="-mx-1 flex items-center max-lg:mx-0 max-lg:gap-5">
          <Social href={TELEGRAM_URL} label="Frames on Telegram" path={TELEGRAM} />
          <Social href={X_URL} label="Frames on X" path={X} />
        </div>
        <span aria-hidden className="w-px self-stretch bg-line" />
        <ThemeSwitch />
        <span aria-hidden className="w-px self-stretch bg-line" />
        <a
          href={FRAMES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 transition-colors duration-150 hover:text-high max-lg:min-h-11"
        >
          <span className="hidden sm:inline">Powered by</span>
          <FramesMark className="size-3.5 rounded-xs" />
          <span className="font-medium text-high">Frames</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </footer>
  );
}

// Brand marks from Simple Icons (CC0), drawn in currentColor so they follow the bar's ink.
const TELEGRAM =
  "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z";
const X =
  "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z";

function Social({ href, label, path }: { href: string; label: string; path: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className="relative flex size-6 items-center justify-center rounded-xs text-med max-lg:before:absolute max-lg:before:-inset-2.5 transition-colors duration-150 outline-none hover:text-high focus-visible:ring-1 focus-visible:ring-focus"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 fill-current">
        <path d={path} />
      </svg>
    </a>
  );
}

const THEMES = [
  ["light", "Light theme", SunIcon],
  ["dark", "Dark theme", MoonIcon],
] as const;

/** Light / dark as a two-segment switch: both options visible, the active one filled. */
function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div role="radiogroup" aria-label="Theme" className="flex items-center rounded-sm border border-line p-px">
      {THEMES.map(([value, label, Icon]) => {
        const active = mounted && resolvedTheme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "relative flex size-5 items-center justify-center rounded-xs transition-colors max-lg:size-8 max-lg:before:absolute max-lg:before:inset-x-0 max-lg:before:-inset-y-1.5 duration-150 outline-none focus-visible:ring-1 focus-visible:ring-focus",
              active ? "bg-surface-3 text-high" : "text-low hover:text-high",
            )}
          >
            <Icon aria-hidden className="size-3" />
          </button>
        );
      })}
    </div>
  );
}
