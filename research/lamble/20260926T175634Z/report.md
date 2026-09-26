# Launchpad metadata enrichment

The landing page now uses enriched chain records for all 19 venues, up from five,
and 13 verified official logo assets served locally. Existing financial observations
and the two narrative charts are preserved. Original landing copy is retained;
the snapshot banner and research notices are absent.

## Acquired and integrated

- Flap: BNB Chain, Robinhood, Base, X Layer and Monad from official mainnet Portal deployment tables. Base was absent from financial coverage. Verified bonding-curve mechanics and configuration differences; Robinhood migrates to a native Uniswap V2 fork.
- LaunchLab: Solana; bonding curve; new launches migrate to Raydium CPMM. Creator/platform configuration is variable.
- Genius.fun: BNB Chain; bonding curve and PancakeSwap Infinity destination from its provider description, corroborated by the official BNB interface.
- Argus: Arc and direct Uniswap v4 pool mechanics from the scoped DefiLlama protocol description. Official ArgusPad homepage failed; an alternate Argus documentation domain was not adopted as its canonical identity.
- Meteora DBC: Solana; configurable curve and fees; DAMM v2 migration, with legacy DAMM v1 support.
- Binance Alpha: BNB Chain, Solana, Base and Ethereum from its official listing notice, dated 2025-04-25. This is a verified subset, not a claim to exhaust all current trading or transfer networks. It is a curated discovery/trading platform, not a uniform bonding-curve launch engine.
- o1: Base and Robinhood from its official homepage. Other chains in financial coverage were not silently added to supported chains.
- Bags: Solana from its developer documentation. Robinhood appears in financial coverage but remains outside the verified support subset in this pass.
- RapidLaunch: nine advertised chains. Solana, Robinhood, BNB Chain, Ethereum, Arc, Base and Monad fit the existing app contract. Stable and Ink are retained in supplemental metadata. Its financial coverage is still Solana only; this is a toolkit over underlying launchpads.
- BaseStonk: Base and Robinhood; direct Uniswap v4 pools and configurable hooks/fees.
- Four.meme: BNB Chain confirmed by official documentation; homepage was geoblocked and was not bypassed.
- Foci: Arc from official homepage metadata.
- BONK.fun and Graphite: Solana deployment support is provider-declared and consistent with their ecosystem relationships. Current official chain documentation remains incomplete; these entries have a weaker evidence basis than the explicit official deployment tables.
- Previously established support for Pump, StonkFun, Pons, Clanker and StonkBrokers is retained or reconfirmed. StonkBrokers Nightshades curve mechanics are confirmed; Pons remains variant-dependent rather than assigned a universal curve flag.

The app now has nine represented ChainId values. Stable and Ink do not silently
extend the original ChainId union. Supported chains and financial metric chains
remain separate in the generated snapshot.

## Branding

13 assets were discovered in official-page favicon metadata through Frames,
downloaded through public HTTPS, checked for image signatures, hashed and stored
under `public/launchpads/`. Browser validation confirmed all 13 load. Other rows
retain letter marks. The o1 favicon download failed; no guessed replacement was
used. Taiyo branding was not substituted for Graphite branding.

## Remaining gaps

- Launch/completion counts and graduation rates still require verified event indexers and proof of complete windows for every venue. Listings or homepage samples are not valid counts.
- Short/missing financial histories remain: Pons previous 30-day comparison; Genius 7-day comparison and 30-day window; Argus 30-day window; StonkBrokers 7-day comparison and 30-day window; RapidLaunch incomplete daily history; BaseStonk previous 30-day comparison; Foci 7-day comparison and 30-day window.
- Most numeric fee configurations, creator fee shares, launch costs and USD graduation targets remain unknown or variant-dependent. Documented token taxes and reserve thresholds are not substituted for those fields.
- Full support sets remain incomplete for several multi-chain venues. The per-row `chainCoverage` explains evidence scope.
- Six rows retain letter marks. Editorial suitability and routing fields have not been invented to fill empty arrays.
- Narrative launches, launchpad launch-share rankings, universal mindshare and trend statuses remain unverified. The existing two charts are measured fixed-pool samples, not market-wide narrative coverage.
- Aggregate fees remain unknown because engine/frontend flows overlap.

## Execution and refresh

Six Frames batches made 37 Firecrawl requests. Exact calls, source bodies,
execution outcomes and billing are in `raw/enrich*-request.json` and
`raw/enrich*.json`. This pass charged **77 credits**, with **84%** remaining in
the final receipt. Provider quotes are not reported as actual charges. The prior
market acquisition charged 230 credits; combined actual charges are 307 credits.

Public asset downloads and one linked Flap Markdown deployment table used direct
HTTPS outside Frames. All activity was read-only against external systems.

Rebuild from saved observations with no spending:

```sh
python3 research/lamble/20260926T175634Z/normalize_enrichment.py
node scripts/import-frames-snapshot.mjs
node --experimental-strip-types --test tests/frames-data.test.mjs
```

For a later explicitly requested refresh, reuse exact mapped official pages. Check
configuration/deployments weekly or after a release; branding monthly; financials
after the upstream UTC day closes; market bars hourly using the existing recipe.
No recurring execution was created. Financial acquisition recipes remain in
`../20260926T172434Z/acquisition-recipes.json`.

## Validation

Production build, TypeScript, lint and five offline tests passed. Tests verify
financial metrics are unchanged, chart reconciliation, null handling, source-backed
chain sets, separation from metric coverage and logo hashes. Browser checks verified
all 19 chain cells, 13 loaded logos, original headline and absence of the snapshot
banner. No deployment or commit was made.
