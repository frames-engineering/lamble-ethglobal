/** Fixed locale so server and client render identical strings. */
const LOCALE = "en-US";

const compactUsd1 = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const compactUsd2 = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
const fullUsd = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const intFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const compactInt = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });

/** $1.2M, $860K, $12 — compact currency. */
export function compactUsd(n: number | null, digits: 1 | 2 = 1): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) < 1000) return fullUsd.format(n);
  return (digits === 2 ? compactUsd2 : compactUsd1).format(n);
}

export function usd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return fullUsd.format(n);
}

export function int(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return intFmt.format(n);
}

/** 41.2K, 1.3M — compact plain number. */
export function compactNumber(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) < 1000) return intFmt.format(n);
  return compactInt.format(n);
}

export interface PercentOptions {
  signed?: boolean;
  digits?: number;
}

/** Percent with a real minus sign: +4.5%, −12.8%, 21.6%. */
export function percent(n: number | null, opts: PercentOptions = {}): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const digits = opts.digits ?? 1;
  const abs = Math.abs(n).toFixed(digits);
  if (n < 0) return `−${abs}%`;
  if (opts.signed && n > 0) return `+${abs}%`;
  return `${abs}%`;
}

/** Basis points → "1.0%". */
export function bps(n: number | null, digits = 1): string {
  return n === null || !Number.isFinite(n) ? "—" : `${(n / 100).toFixed(digits)}%`;
}

/** Explicit reference time keeps server/client output deterministic. */
export function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

/** Month label for chart ticks, e.g. "Sep". */
export function monthTick(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(LOCALE, { month: "short", timeZone: "UTC" });
}

/** "Sep 26" */
export function shortDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(LOCALE, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Hour label for intraday chart ticks, e.g. "14:00" (UTC, like the fixtures). */
export function hourTick(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
}

/** "Sep 25, 14:00 UTC" */
export function shortDateTime(unixSeconds: number): string {
  return `${shortDate(unixSeconds)}, ${hourTick(unixSeconds)} UTC`;
}

/** Strip protocol and trailing slash: "https://www.pump.fun/" → "pump.fun". */
export function domainOf(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
  } catch {
    return url;
  }
}
