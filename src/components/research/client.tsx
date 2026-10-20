"use client";

import { CheckIcon, CopyIcon, StarIcon } from "lucide-react";
import { useCallback, useSyncExternalStore, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      aria-live="polite"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** A copyable block (prompt, curl command). */
export function CopyBlock({ text, label, className }: { text: string; label: string; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg bg-surface-2", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-2xs text-med">{label}</span>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-64 overflow-auto px-3 py-2 font-mono text-2xs leading-relaxed whitespace-pre-wrap text-med [overflow-wrap:anywhere]">{text}</pre>
    </div>
  );
}

// ---------------------------------------------------------------- local watchlist (no account; this browser only)

const KEY = "lamble.watchlist.v1";
const listeners = new Set<() => void>();

function readWatchlist(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, 500) : [];
  } catch {
    return [];
  }
}

let snapshot: string[] | null = null;
function getSnapshot(): string[] {
  if (snapshot === null) snapshot = readWatchlist();
  return snapshot;
}
const EMPTY: string[] = [];

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = readWatchlist();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWatchlist() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const toggle = useCallback((id: string) => {
    const current = readWatchlist();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage disabled: the watchlist simply does not persist.
    }
    snapshot = next;
    for (const l of listeners) l();
  }, []);
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

/** Star toggle for a coin or narrative id. Stored in this browser only; no account and nothing sent anywhere. */
export function WatchButton({ id, label }: { id: string; label: string }) {
  const { has, toggle } = useWatchlist();
  const on = has(id);
  return (
    <Button type="button" variant={on ? "secondary" : "outline"} size="sm" aria-pressed={on} onClick={() => toggle(id)} title="Saved in this browser only">
      <StarIcon className={on ? "fill-current text-warning" : ""} />
      {on ? `Watching ${label}` : `Watch ${label}`}
    </Button>
  );
}
