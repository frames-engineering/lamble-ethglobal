/**
 * Destination verification, recorded in data/delivery/verifications.json (no secrets, no codes in clear):
 *
 * - Webhook: a signed POST with a random challenge; the endpoint must answer 200 with {"challenge": <same>}.
 *   That shows whoever runs the endpoint chose to receive LAMBLE events at that URL.
 * - Telegram: the bot sends a one-time code to the chat; the operator records it with `deliver confirm` after
 *   a member of the chat passes it on. Only its SHA-256 is stored; it expires after 30 minutes and allows five
 *   attempts.
 *
 * A verification covers one target (URL or chat id). Changing the target in the configuration voids it.
 * An operator typing a date is not a verification.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import { type Destination, assertPublicHttpsUrl, sign } from "./deliver.ts";

export interface Verification {
  kind: Destination["kind"];
  target: string;
  method: "webhook-challenge" | "telegram-code";
  verifiedAt: string | null;
  pending: { codeSha256: string; sentAt: string; expiresAt: string; attempts: number } | null;
}

export interface VerificationFile {
  destinations: Record<string, Verification>;
}

const CODE_TTL_MS = 30 * 60_000;
const MAX_ATTEMPTS = 5;
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function targetOf(d: Destination): string {
  return d.kind === "webhook" ? (d.url ?? "") : (d.chatId ?? "");
}

/** Null when the destination's current target is verified; otherwise why not. */
export function verificationProblem(d: Destination, file: VerificationFile): string | null {
  const v = file.destinations[d.id];
  if (!v || !v.verifiedAt) return v?.pending ? "verification pending (deliver confirm)" : "destination not verified (deliver verify)";
  if (v.kind !== d.kind || v.target !== targetOf(d)) return "target changed since verification; verify again";
  return null;
}

export interface VerifyOptions {
  fetch?: typeof fetch;
  lookup?: (host: string) => Promise<{ address: string }[]>;
  now?: () => number;
}

/** Sends a signed challenge to a webhook and records it as verified only on an exact echo. */
export async function verifyWebhook(d: Destination, secret: string, o: VerifyOptions = {}): Promise<Verification> {
  if (d.kind !== "webhook" || !d.url) throw new Error("not a webhook destination");
  const now = o.now ?? Date.now;
  const url = await assertPublicHttpsUrl(d.url, o.lookup);
  const challenge = randomBytes(24).toString("hex");
  const body = JSON.stringify({ schemaVersion: "lamble.verification.v1", type: "url_verification", destination: d.id, challenge });
  const t = Math.floor(now() / 1000);
  const res = await (o.fetch ?? fetch)(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: { "Content-Type": "application/json", "Lamble-Signature": `t=${t},v1=${sign(secret, t, body)}` },
    body,
  });
  if (!res.ok) throw new Error(`verification failed: HTTP ${res.status}`);
  let echoed: unknown;
  try {
    echoed = ((await res.json()) as { challenge?: unknown }).challenge;
  } catch {
    echoed = undefined;
  }
  if (typeof echoed !== "string" || echoed.length !== challenge.length || !timingSafeEqual(Buffer.from(echoed), Buffer.from(challenge))) {
    throw new Error("verification failed: the endpoint did not echo the challenge");
  }
  return { kind: "webhook", target: d.url, method: "webhook-challenge", verifiedAt: iso(now()), pending: null };
}

/** Sends a one-time code to a Telegram chat; returns a pending verification holding only the code's hash. */
export async function startTelegram(d: Destination, botToken: string, o: VerifyOptions = {}): Promise<Verification> {
  if (d.kind !== "telegram" || !/^-?\d{1,20}$/.test(d.chatId ?? "")) throw new Error("not a telegram destination with a numeric chat id");
  const now = o.now ?? Date.now;
  const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
  const res = await (o.fetch ?? fetch)(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: d.chatId, text: `LAMBLE verification code: ${code}\nGive it to the LAMBLE operator to confirm this chat should receive change notifications. It expires in 30 minutes.`, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  return { kind: "telegram", target: d.chatId!, method: "telegram-code", verifiedAt: null, pending: { codeSha256: sha(code), sentAt: iso(now()), expiresAt: iso(now() + CODE_TTL_MS), attempts: 0 } };
}

/** Checks a relayed code against a pending Telegram verification. Returns the updated record; throws on refusal. */
export function confirmTelegram(v: Verification, code: string, now = Date.now()): Verification {
  const p = v.pending;
  if (v.method !== "telegram-code" || !p) throw new Error("no pending Telegram verification; run deliver verify first");
  if (now > Date.parse(p.expiresAt)) throw new Error("the code expired; run deliver verify again");
  if (p.attempts >= MAX_ATTEMPTS) throw new Error("too many attempts; run deliver verify again");
  const ok = /^\d{8}$/.test(code) && timingSafeEqual(Buffer.from(sha(code), "hex"), Buffer.from(p.codeSha256, "hex"));
  if (!ok) {
    p.attempts++;
    throw new Error(`wrong code (${MAX_ATTEMPTS - p.attempts} attempt(s) left)`);
  }
  return { ...v, verifiedAt: iso(now), pending: null };
}
