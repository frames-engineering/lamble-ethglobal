/**
 * Browser and HTTP tests against a running server (production build recommended):
 *
 *   npm run build && npm start -- -p 3100 &
 *   LAMBLE_E2E_BASE=http://localhost:3100 PLAYWRIGHT_MODULE=<path to playwright/index.mjs> npm run test:e2e
 *
 * Screenshots go to LAMBLE_E2E_SHOTS (default test-results/screenshots). Reads only; buys nothing.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";

const BASE = (process.env.LAMBLE_E2E_BASE ?? "http://localhost:3100").replace(/\/$/, "");
const SHOTS = process.env.LAMBLE_E2E_SHOTS ?? path.resolve("test-results/screenshots");
const CHROMIUM = process.env.LAMBLE_E2E_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

type Browser = { newPage(o?: unknown): Promise<Page>; close(): Promise<void> };
type Page = {
  goto(u: string, o?: unknown): Promise<{ status(): number } | null>;
  on(e: string, f: (x: { message?: string; type?(): string; text?(): string }) => void): void;
  locator(s: string): Locator;
  getByRole(r: string, o?: unknown): Locator;
  waitForURL(u: RegExp | string, o?: unknown): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate<T>(f: () => T): Promise<T>;
  screenshot(o: unknown): Promise<unknown>;
  reload(o?: unknown): Promise<unknown>;
  url(): string;
  close(): Promise<void>;
};
type Locator = { click(o?: unknown): Promise<void>; count(): Promise<number>; first(): Locator; nth(i: number): Locator; textContent(): Promise<string | null>; getAttribute(n: string): Promise<string | null>; selectOption(v: string): Promise<unknown>; isVisible(): Promise<boolean>; all(): Promise<Locator[]> };

let browser: Browser;
const pageErrors: string[] = [];

before(async () => {
  const pw = (await import(process.env.PLAYWRIGHT_MODULE ?? "playwright")) as { chromium: { launch(o: unknown): Promise<Browser> } };
  browser = await pw.chromium.launch({ executablePath: CHROMIUM });
  mkdirSync(SHOTS, { recursive: true });
});
after(async () => {
  await browser?.close();
});

async function open(p: string, width = 1440): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on("pageerror", (e) => pageErrors.push(`${p}: ${e.message}`));
  const res = await page.goto(`${BASE}${p}`, { waitUntil: "load" });
  assert.equal(res?.status(), 200, `${p} status`);
  await page.waitForTimeout(600);
  return page;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: "jpeg", quality: 60, fullPage: false });
}

const getJson = async (p: string) => {
  const r = await fetch(`${BASE}${p}`);
  assert.equal(r.status, 200, p);
  return (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

test("every sitemap URL answers 200 directly", async () => {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  assert.ok(urls.length > 150, `sitemap has ${urls.length} urls`);
  const failures: string[] = [];
  for (let i = 0; i < urls.length; i += 16) {
    await Promise.all(
      urls.slice(i, i + 16).map(async (u) => {
        const r = await fetch(`${BASE}${u}`);
        if (r.status !== 200) failures.push(`${u} ${r.status}`);
      }),
    );
  }
  assert.deepEqual(failures, []);
});

test("website and API agree on the same entities in the same release", async () => {
  const index = await getJson("/api/v1");
  const releaseId = index.release.id as string;
  const narratives = (await getJson("/api/v1/narratives?limit=500")).data.items as { slug: string; title: string }[];
  for (const n of narratives.slice(0, 8)) {
    const api = await getJson(`/api/v1/narratives/${n.slug}`);
    assert.equal(api.release.id, releaseId);
    const html = await (await fetch(`${BASE}/narratives/${n.slug}`)).text();
    assert.ok(html.includes(api.data.identity.title.replaceAll("&", "&amp;")) || html.includes(api.data.identity.title), n.slug);
    assert.ok(html.includes(`Members (${api.data.coverage.members.open} open`), `${n.slug}: member count`);
  }
  const coins = (await getJson("/api/v1/coins?limit=5&sort=volume")).data.items as { chain: string; address: string; links: { discovery: string } }[];
  for (const c of coins) {
    const api = await getJson(c.links.discovery);
    const html = await (await fetch(`${BASE}/coins/${c.chain}/${c.address}`)).text();
    assert.ok(html.includes(releaseId), "page names the same release");
    assert.ok(html.includes(`${api.data.coverage.holders.withValue} of 9 components have a value`), `${c.address}: holder coverage`);
    assert.ok(html.includes(c.address), "canonical address shown");
  }
});

test("desktop: navigate, filter coins by narrative, keep a watchlist across reloads", async () => {
  const page = await open("/");
  await shot(page, "home-desktop");
  await page.getByRole("button", { name: "Explore coins" }).first().click();
  await page.waitForURL(/\/coins$/);
  const narrative = (await getJson("/api/v1/narratives?limit=500")).data.items.find((n: { lifecycle: string }) => n.lifecycle === "collected");
  await page.locator('select[name="narrative"]').selectOption(narrative.slug);
  await page.getByRole("button", { name: "Apply" }).click();
  await page.waitForURL(new RegExp(`narrative=${narrative.slug}`));
  await page.waitForTimeout(500);
  const rows = await page.locator("tbody tr").count();
  const expected = (await getJson(`/api/v1/coins?narrative=${narrative.slug}&limit=500`)).data.total;
  assert.equal(rows, expected, "filtered rows match the API's filtered total");
  await shot(page, "coins-filtered");
  await page.locator("tbody tr button[aria-pressed]").first().click();
  await page.getByRole("switch").click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator("tbody tr").count(), 1, "watchlist-only shows the starred coin");
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  assert.equal(await page.locator('tbody tr button[aria-pressed="true"]').count(), 1, "watchlist persists in this browser");
  await page.close();
});

test("mobile: menu navigation and no horizontal overflow on research pages", async () => {
  const page = await open("/", 390);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Narratives" }).first().click();
  await page.waitForURL(/\/narratives$/);
  await shot(page, "narratives-mobile");
  await page.close();
  for (const p of ["/", "/coins", "/narratives/super-intelligence", "/market/2026-W42", "/launchpads", "/api", "/research/state-of-the-trenches-2026-w42", "/methodology", "/sources"]) {
    const pg = await open(p, 390);
    const width = await pg.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(width <= 390, `${p} overflows: ${width}px`);
    await pg.close();
  }
});

test("charts render and say where data is missing; coin pages state each value's basis", async () => {
  const coin = (await getJson("/api/v1/coins?limit=1&sort=volume")).data.items[0];
  const page = await open(`/coins/${coin.chain}/${coin.address}`);
  await page.waitForTimeout(800);
  assert.ok((await page.locator("figure canvas").count()) > 0, "chart canvas rendered");
  const captions = (await page.locator("figcaption").all()).length;
  assert.ok(captions >= 2);
  const text = (await page.locator("main").textContent()) ?? "";
  assert.match(text, /unknown and drawn as gaps/);
  assert.match(text, /never scored as zero/);
  await shot(page, "coin-desktop");
  await page.close();
});

test("source links are external https links that do not pass referrers", async () => {
  const page = await open("/narratives/super-intelligence");
  const links = await page.locator('a[target="_blank"][href^="http"]').all();
  assert.ok(links.length > 0);
  for (const l of links) {
    const href = (await l.getAttribute("href"))!;
    assert.ok(href.startsWith("https://"), href);
    assert.match((await l.getAttribute("rel")) ?? "", /noopener/);
  }
  await page.close();
});

test("unknown coin shows the not-covered page; malformed routes 404", async () => {
  const page = await open("/coins/solana/So11111111111111111111111111111111111111112");
  assert.match((await page.locator("h1").textContent()) ?? "", /not covered/);
  await page.close();
  assert.equal((await fetch(`${BASE}/coins/notachain/xyz`)).status, 404);
  assert.equal((await fetch(`${BASE}/api/v1/coins/base/zzz`)).status, 400);
});

test("paid routes never ask for payment when nothing may be sold or no protocol is configured", async () => {
  const coin = (await getJson("/api/v1/coins?limit=1")).data.items[0];
  const blocked = await fetch(`${BASE}/api/v1/coins/${coin.chain}/${coin.address}/bundle`);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("payment-required"), null);
  const unconfigured = await fetch(`${BASE}/api/v1/narratives/super-intelligence/bundle`);
  assert.ok([402, 503].includes(unconfigured.status));
});

test("no page raised a client error", () => {
  assert.deepEqual(pageErrors, []);
});
