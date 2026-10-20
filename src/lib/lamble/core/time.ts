/**
 * Time conventions. Every timestamp is unix seconds, UTC.
 *
 * Calendar weeks are ISO 8601 weeks: Monday 00:00 UTC to the following Monday 00:00 UTC, end exclusive.
 * A week's id is its ISO week-year and number (2026-W42). The ISO week-year can differ from the calendar
 * year around New Year: Monday 2026-12-28 starts 2026-W53 and Monday 2027-01-04 starts 2027-W01.
 */

export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86_400;
export const WEEK = 7 * DAY;
/** 1970-01-05 was the first Monday after the epoch. */
const FIRST_MONDAY = 4 * DAY;

export interface Interval {
  /** Inclusive start, unix seconds. */
  start: number;
  /** Exclusive end, unix seconds. */
  end: number;
}

export function iso(t: number): string {
  return new Date(t * 1000).toISOString().replace(".000Z", "Z");
}

export function parseIso(value: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new RangeError(`Not a timestamp: ${value}`);
  return Math.floor(ms / 1000);
}

/** Parses `YYYYMMDDTHHMMSSZ` research run ids. */
export function parseRunId(runId: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(runId);
  if (!m) throw new RangeError(`Not a run id: ${runId}`);
  const [, y, mo, d, h, mi, s] = m.map(Number) as number[];
  return Date.UTC(y!, mo! - 1, d!, h!, mi!, s!) / 1000;
}

export function compactStamp(t: number): string {
  return iso(t).replace(/[-:]/g, "");
}

export function floorTo(t: number, step: number): number {
  return Math.floor(t / step) * step;
}

export function dayStart(t: number): number {
  return floorTo(t, DAY);
}

/** Monday 00:00 UTC on or before t. */
export function weekStart(t: number): number {
  const offset = (((t - FIRST_MONDAY) % WEEK) + WEEK) % WEEK;
  return t - offset;
}

export function calendarWeek(t: number): Interval {
  const start = weekStart(t);
  return { start, end: start + WEEK };
}

/** ISO week id of the week containing t, e.g. "2026-W42". */
export function weekId(t: number): string {
  const start = weekStart(t);
  const thursday = new Date((start + 3 * DAY) * 1000);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1) / 1000;
  const dayOfYear = Math.floor((start + 3 * DAY - jan1) / DAY); // 0-based
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

const WEEK_ID = /^(\d{4})-W(\d{2})$/;

export function isWeekId(value: string): boolean {
  return parseWeekIdOrNull(value) !== null;
}

/** Start (Monday 00:00 UTC) of an ISO week id; null when the id is malformed or the week does not exist (W53 in a 52-week year). */
export function parseWeekIdOrNull(value: string): number | null {
  const m = WEEK_ID.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  // Week 1 is the week containing January 4th.
  const week1 = weekStart(Date.UTC(year, 0, 4) / 1000);
  const start = week1 + (week - 1) * WEEK;
  return weekId(start) === value ? start : null;
}

export function parseWeekId(value: string): Interval {
  const start = parseWeekIdOrNull(value);
  if (start === null) throw new RangeError(`Not an ISO week id: ${value}`);
  return { start, end: start + WEEK };
}

export function previousWeekId(id: string): string {
  return weekId(parseWeekId(id).start - WEEK);
}

export function nextWeekId(id: string): string {
  return weekId(parseWeekId(id).start + WEEK);
}

/** The latest calendar week that has fully ended at time t. */
export function lastCompleteWeek(t: number): Interval {
  const start = weekStart(t) - WEEK;
  return { start, end: start + WEEK };
}

/** The developing current calendar week: Monday 00:00 UTC to t (partial). */
export function developingWeek(t: number): Interval & { partial: true; elapsedSeconds: number } {
  const start = weekStart(t);
  return { start, end: t, partial: true, elapsedSeconds: t - start };
}

/** Rolling seven days ending at an anchor (exclusive). Distinct from the calendar week. */
export function rollingSevenDays(anchor: number): Interval {
  return { start: anchor - WEEK, end: anchor };
}

export function contains(interval: Interval, t: number): boolean {
  return t >= interval.start && t < interval.end;
}

/** Whole UTC days inside an interval, as day starts. */
export function daysIn(interval: Interval): number[] {
  const out: number[] = [];
  for (let t = Math.ceil(interval.start / DAY) * DAY; t + DAY <= interval.end; t += DAY) out.push(t);
  return out;
}
