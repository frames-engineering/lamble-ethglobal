/**
 * Change-event delivery to webhooks and Telegram chats. Built and tested, not activated: the configuration
 * (docs/data/notifications.json) ships disabled with no destinations, and the runner also requires
 * LAMBO_DELIVERY_ENABLED=true.
 *
 * - A destination is eligible only with verifiedAt and consentAt recorded by an operator and no revokedAt.
 * - Secrets (webhook signing secret, Telegram bot token) are read from the environment variable the
 *   destination names; they are never stored in the configuration or the state file.
 * - Webhook URLs must be public https endpoints: no credentials, no IP literals, no private, loopback or
 *   link-local addresses after DNS resolution, no redirects. Event text is never a fetch target.
 * - Delivery is at least once and ordered per destination: each event carries Lambo-Delivery-Id
 *   (<destination>:<seq>) so receivers can deduplicate. Failures back off and stop that destination's queue.
 */
import { createHmac } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

import type { ChangeEvent } from "../release/types.ts";

export interface Destination {
  id: string;
  kind: "webhook" | "telegram";
  url?: string;
  chatId?: string;
  /** Name of the environment variable holding the webhook signing secret or the Telegram bot token. */
  secretEnv: string;
  verifiedAt: string | null;
  consentAt: string | null;
  revokedAt: string | null;
  filter: { entityTypes?: string[]; entityIds?: string[]; kinds?: string[] };
}

export interface NotificationsConfig {
  enabled: boolean;
  note?: string;
  destinations: Destination[];
}

export interface DestinationState {
  cursor: number;
  attempts: number;
  nextAttemptAt: number | null;
  lastError: string | null;
  day: string | null;
  sentToday: number;
}

export interface DeliveryState {
  destinations: Record<string, DestinationState>;
}

export interface DeliveryPolicy {
  maxAttempts: number;
  backoffSeconds: number[];
  maxDeliveriesPerDestinationPerDay: number;
}

const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;

export function eligibility(d: Destination): string | null {
  if (!ID.test(d.id)) return "invalid id";
  if (!d.verifiedAt) return "destination not verified";
  if (!d.consentAt) return "no recorded consent";
  if (d.revokedAt) return "revoked";
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(d.secretEnv)) return "secretEnv must name an environment variable";
  if (d.kind === "webhook" && !d.url) return "webhook without url";
  if (d.kind === "telegram" && !/^-?\d{1,20}$/.test(d.chatId ?? "")) return "telegram chatId must be numeric";
  return null;
}

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function privateV6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x.startsWith("::ffff:")) return privateV4(x.slice(7));
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("ff");
}

export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  return v === 4 ? privateV4(ip) : v === 6 ? privateV6(ip) : true;
}

/** Throws unless the URL is a public https endpoint that resolves only to public addresses. */
export async function assertPublicHttpsUrl(raw: string, lookup: (host: string) => Promise<{ address: string }[]> = (h) => dnsLookup(h, { all: true })): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "https:") throw new Error("webhook must use https");
  if (u.username || u.password) throw new Error("webhook URL must not contain credentials");
  if (u.port && u.port !== "443") throw new Error("webhook must use port 443");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) throw new Error("webhook host must be a name, not an IP literal");
  if (/(^|\.)(localhost|local|internal|home|lan)$/i.test(host) || !host.includes(".")) throw new Error("webhook host must be public");
  const addrs = await lookup(host);
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("webhook host resolves to a non-public address");
  return u;
}

export function sign(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function matches(d: Destination, e: ChangeEvent): boolean {
  const f = d.filter ?? {};
  return (!f.entityTypes?.length || f.entityTypes.includes(e.entityType)) && (!f.entityIds?.length || f.entityIds.includes(e.entityId)) && (!f.kinds?.length || f.kinds.includes(e.kind));
}

/** Plain text, control characters removed, bounded; never parsed as markup by the receiver. */
export function formatText(e: ChangeEvent, siteUrl: string): string {
  const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 600);
  const link =
    e.entityType === "coin"
      ? `${siteUrl}/coins/${e.entityId.slice(0, e.entityId.indexOf(":"))}/${e.entityId.slice(e.entityId.indexOf(":") + 1)}`
      : e.entityType === "narrative"
        ? `${siteUrl}/narratives/${e.entityId}`
        : `${siteUrl}/market`;
  return `${clean(e.summary)}\n${link}\nLAMBLE change #${e.seq} (release ${e.releaseId})${e.reconstructed ? ", reconstructed" : ""}`;
}

export interface DeliverOptions {
  config: NotificationsConfig;
  events: ChangeEvent[];
  state: DeliveryState;
  env: Record<string, string | undefined>;
  policy: DeliveryPolicy;
  siteUrl: string;
  fetch?: typeof fetch;
  lookup?: (host: string) => Promise<{ address: string }[]>;
  now?: () => number;
  dryRun?: boolean;
}

export interface DeliveryResult {
  destination: string;
  status: "disabled" | "ineligible" | "waiting" | "delivered" | "failed" | "planned" | "idle" | "daily-cap";
  delivered: number;
  detail: string;
}

export async function deliver(o: DeliverOptions): Promise<DeliveryResult[]> {
  const doFetch = o.fetch ?? fetch;
  const now = o.now ?? Date.now;
  const results: DeliveryResult[] = [];
  if (!o.config.enabled || o.env.LAMBO_DELIVERY_ENABLED !== "true") {
    return [{ destination: "*", status: "disabled", delivered: 0, detail: "Delivery is disabled (docs/data/notifications.json enabled=false or LAMBO_DELIVERY_ENABLED unset)." }];
  }
  for (const d of o.config.destinations) {
    const why = eligibility(d);
    if (why) {
      results.push({ destination: d.id, status: "ineligible", delivered: 0, detail: why });
      continue;
    }
    const secret = o.env[d.secretEnv];
    if (!secret) {
      results.push({ destination: d.id, status: "ineligible", delivered: 0, detail: `${d.secretEnv} is not set` });
      continue;
    }
    const latest = o.events.at(-1)?.seq ?? 0;
    // A new destination starts at the current end of the feed: no backfill of history it never asked for.
    const st = (o.state.destinations[d.id] ??= { cursor: latest, attempts: 0, nextAttemptAt: null, lastError: null, day: null, sentToday: 0 });
    if (st.nextAttemptAt && now() < st.nextAttemptAt) {
      results.push({ destination: d.id, status: "waiting", delivered: 0, detail: `backing off until ${new Date(st.nextAttemptAt).toISOString()}` });
      continue;
    }
    const today = new Date(now()).toISOString().slice(0, 10);
    if (st.day !== today) {
      st.day = today;
      st.sentToday = 0;
    }
    const queue = o.events.filter((e) => e.seq > st.cursor && matches(d, e));
    if (!queue.length) {
      st.cursor = Math.max(st.cursor, latest);
      results.push({ destination: d.id, status: "idle", delivered: 0, detail: "nothing new" });
      continue;
    }
    if (o.dryRun) {
      results.push({ destination: d.id, status: "planned", delivered: 0, detail: `${queue.length} event(s) after #${st.cursor}` });
      continue;
    }
    let sent = 0;
    let failure: string | null = null;
    for (const e of queue) {
      if (st.sentToday >= o.policy.maxDeliveriesPerDestinationPerDay) {
        failure = "daily cap reached";
        break;
      }
      try {
        if (d.kind === "webhook") {
          const url = await assertPublicHttpsUrl(d.url!, o.lookup);
          const body = JSON.stringify({ schemaVersion: "lambo.notification.v1", destination: d.id, event: e, text: formatText(e, o.siteUrl) });
          const t = Math.floor(now() / 1000);
          const res = await doFetch(url, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
            headers: { "Content-Type": "application/json", "Lambo-Delivery-Id": `${d.id}:${e.seq}`, "Lambo-Signature": `t=${t},v1=${sign(secret, t, body)}` },
            body,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          const res = await doFetch(`https://api.telegram.org/bot${secret}/sendMessage`, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: d.chatId, text: formatText(e, o.siteUrl), disable_web_page_preview: true }),
          });
          if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
        }
        st.cursor = e.seq;
        st.sentToday++;
        st.attempts = 0;
        st.nextAttemptAt = null;
        st.lastError = null;
        sent++;
      } catch (err) {
        // Never echo a URL that could carry the bot token.
        failure = String((err as Error).message).replace(/bot[^/\s]+/g, "bot***");
        break;
      }
    }
    if (failure && failure !== "daily cap reached") {
      st.attempts++;
      st.lastError = failure;
      const delay = o.policy.backoffSeconds[Math.min(st.attempts - 1, o.policy.backoffSeconds.length - 1)] ?? 3600;
      st.nextAttemptAt = st.attempts >= o.policy.maxAttempts ? now() + 24 * 3600_000 : now() + delay * 1000;
      results.push({ destination: d.id, status: "failed", delivered: sent, detail: `${failure}; attempt ${st.attempts}` });
    } else if (failure) {
      results.push({ destination: d.id, status: "daily-cap", delivered: sent, detail: failure });
    } else {
      results.push({ destination: d.id, status: "delivered", delivered: sent, detail: `through #${st.cursor}` });
    }
  }
  return results;
}
