import { setTimeout as delay } from "node:timers/promises";

const origin = new URL(process.argv[2]);
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
if (process.env.GITHUB_EVENT_NAME === "repository_dispatch" || bypass) {
  const isLambleDeployment = /^lamble-ethglobal-[a-z0-9]+-inventionshub\.vercel\.app$/.test(origin.hostname);
  if (!isLambleDeployment || origin.protocol !== "https:" || origin.port || origin.username || origin.password) {
    throw new Error("Expected the generated Lamble Vercel deployment URL");
  }
  if (!bypass) throw new Error("Set VERCEL_AUTOMATION_BYPASS_SECRET for the protected deployment URL");
}
const pages = {
  "/": "The Trenches",
  "/coins": "Coins",
  "/narratives": "Narratives",
  "/launchpads": "Launchpads",
  "/market": "Market",
  "/research": "Research",
};

async function get(path, contentType) {
  const response = await fetch(new URL(path, origin), {
    cache: "no-store",
    headers: bypass ? { "x-vercel-protection-bypass": bypass } : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status !== 200 || !response.headers.get("content-type")?.startsWith(contentType)) {
    await response.body?.cancel();
    throw new Error(`${path} returned HTTP ${response.status} with unexpected status or content type`);
  }
  return response;
}

async function smoke() {
  const health = await (await get("/api/v1/health", "application/json")).json();
  if (health.ok !== true || health.release?.checksumVerified !== true || health.release?.validation !== true) {
    throw new Error("/api/v1/health did not report a verified release");
  }
  await Promise.all(Object.entries(pages).map(async ([path, heading]) => {
    const html = await (await get(path, "text/html")).text();
    if (!new RegExp(`<h1\\b[^>]*>\\s*${heading}\\s*</h1>`).test(html) || /<template\b[^>]*\bdata-dgst=/.test(html)) {
      throw new Error(`${path} did not render its expected heading or contained a server rendering error`);
    }
  }));
  console.log(`Verified ${Object.keys(pages).length} pages and release health at ${origin.origin}`);
}

for (let attempt = 1; attempt <= 5; attempt++) {
  try {
    await smoke();
    break;
  } catch (error) {
    console.error(`Smoke attempt ${attempt}: ${error.message}`);
    if (attempt === 5) process.exitCode = 1;
    else await delay(5_000);
  }
}
