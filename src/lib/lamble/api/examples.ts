/**
 * Example responses for the OpenAPI description, produced by the real free route bodies against the published
 * release (lists truncated). Paid routes get only their refusal bodies: bundle values are the paid content, and
 * an offer is never created just to illustrate one.
 */
import { RESOURCE_KINDS } from "../payments/pricing.ts";
import type { ApiExamples } from "./openapi.ts";
import { paidRefusal } from "./paid.ts";
import * as routes from "./routes.ts";

const KEEP = 2;

/** Shortens every array in a response body so an example stays readable; totals are left as they are. */
function truncate(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) return value.slice(0, KEEP).map((v) => truncate(v, depth + 1));
  if (value && typeof value === "object" && depth < 12) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, truncate(v, depth + 1)]));
  return value;
}

export async function apiExamples(siteUrl: string): Promise<ApiExamples> {
  const out: ApiExamples = {};
  const get = (p: string) => new Request(`${siteUrl}${p}`);
  const take = async (op: string, res: Response | Promise<Response>) => {
    const r = await res;
    if (r.status === 304) return null;
    const body = JSON.parse(await r.text()) as Record<string, unknown>;
    (out[op] ??= {})[String(r.status)] = truncate(body);
    return body;
  };
  await take("get_index", routes.index(get("/api/v1"), siteUrl));
  await take("get_health", routes.health());
  await take("get_changes", routes.changes(get("/api/v1/changes?since=0&limit=2")));
  const coins = (await take("list_coins", routes.coins(get("/api/v1/coins?sort=volume&order=desc&limit=2")))) as { data?: { items?: { chain: string; address: string }[] } } | null;
  await take("list_coins", routes.coins(get("/api/v1/coins?sort=unknown")));
  const coin = coins?.data?.items?.[0];
  if (coin) await take("get_coin", routes.coin(get(`/api/v1/coins/${coin.chain}/${coin.address}`), { chain: coin.chain, address: coin.address }));
  await take("get_coin", routes.coin(get("/api/v1/coins/solana/So11111111111111111111111111111111111111112"), { chain: "solana", address: "So11111111111111111111111111111111111111112" }));
  const narratives = (await take("list_narratives", routes.narratives(get("/api/v1/narratives?limit=2")))) as { data?: { items?: { slug: string }[] } } | null;
  const slug = narratives?.data?.items?.[0]?.slug;
  if (slug) await take("get_narrative", routes.narrative(get(`/api/v1/narratives/${slug}`), { slug }));
  const weeks = (await take("list_weeks", routes.weeks(get("/api/v1/market/weeks")))) as { data?: { items?: { id: string }[] } } | null;
  const week = weeks?.data?.items?.at(-1)?.id;
  if (week) await take("get_week", routes.week(get(`/api/v1/market/weeks/${week}`), { week }));
  await take("list_launchpads", routes.launchpads(get("/api/v1/launchpads")));
  const research = (await take("list_research", routes.research(get("/api/v1/research?limit=2")))) as { data?: { items?: { slug: string }[] } } | null;
  const article = research?.data?.items?.[0]?.slug;
  if (article) await take("get_article", routes.article(get(`/api/v1/research/${article}`), { slug: article }));
  for (const kind of RESOURCE_KINDS) {
    const refusal = paidRefusal(kind, false);
    if (refusal) (out[`get_${kind.replaceAll("-", "_")}`] ??= {})[String(refusal.status)] = truncate(refusal.body);
  }
  return out;
}
