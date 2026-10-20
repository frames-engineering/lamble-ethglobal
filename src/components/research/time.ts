/**
 * Date formatting for research pages. Everything is UTC and deterministic: relative phrases are computed
 * against the release cutoff, never against the reader's clock, so server and client render the same text.
 */

const DATE = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function toDate(v: string | number): Date {
  return typeof v === "number" ? new Date(v * 1000) : new Date(v);
}

/** "Oct 19, 2026". Accepts ISO strings or unix seconds. */
export function formatDate(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? "—" : DATE.format(d);
}

/** "Oct 19, 2026, 06:21 UTC". */
export function formatDateTime(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? "—" : `${DATE_TIME.format(d)} UTC`;
}

/** "3d 4h", "5h", "12m". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Age relative to a reference instant (the release cutoff). */
export function ageAt(v: string | number | null | undefined, reference: string): string {
  if (v === null || v === undefined) return "—";
  const then = toDate(v).getTime();
  const ref = new Date(reference).getTime();
  if (Number.isNaN(then) || Number.isNaN(ref)) return "—";
  return `${formatDuration((ref - then) / 1000)} before cutoff`;
}

export function isoSeconds(v: string): number {
  return Math.floor(new Date(v).getTime() / 1000);
}
