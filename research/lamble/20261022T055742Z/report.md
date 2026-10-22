# Daily refresh 2026-10-22 (run 20261022T055742Z)

Run time 2026-10-22 05:57:42 UTC. Financial anchor (exclusive end) 2026-10-22 (last settled day 2026-10-21; StonkFun has no windowed figures). Chart anchor 2026-10-22 04:00 UTC. Prior run for the normalizer: 20261021T055751Z (earlier financial anchor, so it is both the financial and the narrative baseline). Release published: rel-20261022T055742Z-7570fde0.

## New narrative

**n-php2shell, PHP2Shell coins** (created; 2026-10-22 24h chart-window volume $12.77M, four coins, 30-day volume $9.59M). The story: security posts call two critical PHP core flaws, CVE-2026-109618 and CVE-2026-109619 (CVSS 9.2 each, unauthenticated remote code execution), PHP2Shell. Sources (e1:8, e2:0): a post of 2026-10-21 01:07 UTC (@openhack) that PHP would ship emergency security updates at 14:00 UTC that day; Rapid7 (2026-10-21 15:35 UTC) that the PHP project had announced security releases for both flaws and expected exploitation in the wild; a security-news account relaying a Register article (15:09 UTC) headlined that PHP developers published the fix and warned owners to pull unpatched servers offline; a post of 2026-10-22 summarising an AWS report that exploitation was seen on 2026-10-17 (not verified here).

This is the previous report's deferred lead (the PHP-UP-2026 coins): it was deferred because the cap was full, the weakest narrative had just been resumed by the owner's decision, and the pools were under an hour old. Today the release has happened and the pools are 6 to 26 hours old, so it was re-evaluated and created.

| Coin | Launchpad | Metadata | Pool created (UTC) | 24h chart-window volume |
|---|---|---|---|---|
| PHP-UP-2026 (PHP), Cbkg5w... | pump.fun | description "They dropped an exploit that allows you to drain money from anyone." | 2026-10-21 05:14 | $8.24M (64.6%, 6.8x market cap $1.21M) |
| Saviour of the Internet (SURY), DYR8Kq... | pump.fun | description names PHP2Shell and says fees go to Ondrej Sury's GitHub, @oerdj | 2026-10-22 00:05 | $1.41M (11.0%, 8.1x market cap $174K) |
| PHP2SHELL, FjLFsa... | pump.fun | name; empty description | 2026-10-21 04:21 | $1.76M (13.8%, 26x market cap $68K) |
| PHP2SHELL, Bo61v4... | pump.fun | name; empty description | 2026-10-21 21:30 | $1.36M (10.6%, 16x market cap $82K) |

Notes: the three MeteoraDBC PHP-UP-2026 contracts the previous report counted do not appear in this morning's sweeps. The fee routing in SURY's description is the coin's own claim (one post repeats it, e2:0) and is not verified; no coin is shown to be affiliated with the PHP project, the researchers or Sury. The volume caveat is shown (the two PHP2SHELL coins traded over 10x their market cap, 24% of the volume). The two PHP2SHELL coins' market caps ($71K and $99K at discovery) are below the $100K market-cap bar for adding a member, but the member bar in `discover.py` (and the written rule's "or" reading) accepts $50K of volume, which both clear several times over.

## Cluster decisions (7, all recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-php2shell | created (n-php2shell) | SURY and the two PHP2SHELL coins ($5.6M) plus PHP-UP-2026 from the deferred lead; independent sources above. |
| k-fees | rejected | SURY, ORBIO, CLOUT, OGDOGE share only the word fees (four different fee designs). SURY joins n-php2shell on its PHP2Shell description. |
| k-credits | rejected | SURY, ORBIO, RAETO share only the word credits. |
| k-using | rejected | Au (fusion-to-gold meme; e2:1 returned only call-group and gold-forex posts), SHADOW, GTA share only the word using. |
| k-launches | rejected | NOOX (trading agent), CLOUT (AI influencer platform), KYRO (launch dashboard): unrelated tools; e2:2 returned call-group promotion. |
| k-create | rejected | CLOUT, CREORA, OGDOGE share only the word create; e2:3 returned call-group promotion. |
| k-private | rejected | CREORA (private AI), SHADOW (private payments), DRKW (private wallet): three products, no common story ($972K combined). |

Beyond the clusters, the posts and sweeps surfaced no other story meeting the bar. Leads recorded as deferred: **cyber** (CYBER "cybercurrency", $8.4M, empty metadata, and Cyber Trump, "TRUMP IS THE REASON FOR THIS CYBER META", $760K: two coins, no source) and the **Kimchi contract the posts name** (below). Rejected with reasons in curation.json: Claude (Robinhood Chain, $12.7M, name and tagline only), Pullback (Collector Crypt pack coin, one coin of the retired card-gacha lead), MACCA (a GTA 6 mascot, not Dacity Coin). A family of oil-fund and dividend-fund meme coins (XTO, FOTF, NODF, USOE, NAFF, USDF) carries quarantine flags (implausible market caps for pools hours old) and is recorded as quarantined.

## Member and narrative changes

- **n-flying-tesla-roadster paused** at the six-narrative cap (`pausedNarratives`; memberships and pages stay). It had the lowest rolling 24h volume of the six at discovery ($714K, against $12.4M for PHP2Shell; the next lowest, Super Intelligence, $1.44M), and its story is one dated event (the 2026-10-15 unveiling) with no newer announcement. **Judgment call for the owner:** the owner resumed this narrative on 2026-10-20 after the card-gacha correction. This pause is the cap-replacement rule applied to a larger, current story, not a reversal of that decision.
- **n-perpetual-futures**: added Paper (Papertrade, Clanker V4, Base, 0xd0814c...; pool created 2026-10-21 13:42 UTC; metadata "trade with up to 1000x leverage and 0 slippage, on the first fair launched fully onchain perpetual exchange"; $57.87M, 99.9% of the narrative's volume, 5.7x its $10.2M market cap). The previous day's Base copy (0xb3552e...) fell to $48 of chart-window volume (rolling 24h $0); it stays collected for one more observation (the rule needs two consecutive observations under $1,000). Archived (collection stopped, membership open): Paper Base 0x6aedab... ($55 yesterday, $0 today).
- **n-stock-paired-coins**: added Energy Coin (ENERGY, StonkFun; description "Paired with all elon stocks"; $952K, 11.5% of the narrative, 8.5x its $112K market cap).
- **n-super-intelligence**: archived TeslaSI (bsc, 0xaf3c2e...: $977, then $700) and SXSITBL (pump.fun: $0, then $1) on the same under-$1,000 rule.
- **n-kimchi-pumpfun**, **n-gta6-dacity-coin**: no member changes.
- Retired: none. No coin removed by contradicting evidence.
- Candidates looked at and not added: 33 recorded in curation.json.

**Kimchi contract, owner's call.** The contract the Kimchi posts name (Aura Final Boss, symbol Kimchi, pump.fun, CSocnz...; $13.8M rolling 24h volume, $21.3M market cap, 31 hours old, -41% on 24h) carried no quarantine flag in this morning's sweep, but the previous run recorded it as quarantined and the standing rule is never to add quarantined tokens. It is recorded as a deferred candidate. If the owner treats the flag as cleared, it would be the narrative's largest constituent (the narrative currently measures only lookalikes: $2.26M, down 88.6%).

## Data changes vs yesterday (run 20261021T055751Z)

Anchors: financial 2026-10-22 (all venues through 2026-10-21 except StonkFun, which has no windowed figures); chart 2026-10-22 04:00 UTC; daily bars through 2026-10-22 00:00 UTC (30 days).

- Covered fee subtotal (14 included venues): **$3,292,915** against $3,505,868 (-6.1%).
- Indexed launches 24h: **55,601** against 59,245 (-6.2%); completions 24h: **3,247** against 3,272 (-0.8%). 14 creation venues, 11 completion venues.
- Windowed sums over launchpads with data (sums add overlapping venues, so they are not a de-duplicated market total):

| Window | Fees | Revenue | Creator earnings (15 venues measured) |
|---|---|---|---|
| 24h | $3.38M (-5.8%) | $1.72M (-5.2%) | $1.66M (-6.4%) |
| 7d | $23.40M (-1.9%) | $11.94M (-0.8%) | $11.47M (-2.9%) |
| 30d | $148.97M (-3.5%) | $67.87M (-2.1%) | $81.09M (-4.7%) |

pump.fun creator earnings $606,749 (24h; $623,553 yesterday), Flap $523,497 ($565,586), Pons $400,977 ($454,937).

- Narratives (24h chart-window volume, change on the preceding 24h window, 30-day volume of current members):

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Perpetual-futures coins | 5 | $57.91M | +5.5% | $124.84M |
| PHP2Shell coins (new) | 4 | $12.77M | n/a (preceding window about $30K) | $9.59M |
| GTA 6 Dacity Coin coins | 4 | $9.81M | -17.5% | $50.05M |
| Coins paired with tokenized stocks | 5 | $8.26M | -34.3% | $684.96M |
| Super Intelligence coins | 12 | $2.94M | -20.8% | $470.62M |
| Kimchi coins | 5 | $2.26M | -88.6% | $24.77M |
| Flying Tesla Roadster coins (paused, 7 coins) | not collected | last featured $1.25M on 2026-10-21 | | |

Volume caveats shown: PHP2Shell coins (two PHP2SHELL coins over 10x market cap, 24% of the volume) and Kimchi coins (Kimchi Boss at 506x and kimchi at 16x market cap, 73% of the volume). The GTA 6 Dacity Coin caveat from yesterday is gone.

## Story changes

- PHP2Shell: new (above).
- Perps: no new Papertrade announcement; the newest $PAPER posts (2026-10-22, e1:4) come from a strategy account about staking. Papertrade's site still reads "1000x leverage, 0 market impact, 100% user owned, fully onchain on hyperliquid" (e1:0). Each day a new Clanker Paper contract takes the volume the previous one had.
- Stock-paired: the xstok search returned posts only from 2026-10-15 to 2026-10-17 (live on 2026-10-16, CoinGecko listing submitted 2026-10-17); no newer news. ENERGY joined.
- Kimchi: posts of 2026-10-22 (e1:2) still describe the trader as up about $38M on the new launch and as partnering with Pump.fun; the volume has collapsed in the counted contracts and sits in the uncounted one.
- GTA 6 Dacity Coin: newest post 2026-10-21 10:14 UTC repeats the leak claim; no news outlet or official page.
- Super Intelligence: no posts newer than 2026-10-18; the White House SIF and SpaceXSI posts date from 2026-10-04 to 2026-10-09.
- Roadster (paused): no new announcement seen.

## Failures and refunds

- 703 calls requested, 543 delivered; 160 not delivered and refunded ($0): panels 154 of 615 (101 seller errors, 51 negative results, 1 caller error, 1 undocumented); f3:0 (graphite-protocol dailySupplySideRevenue) and f5:4 (bags dailySupplySideRevenue), refunded negative results retained as the two disputed deliveries in validation-report.json (neither figure is used); c1:3 (Robinhood hourly bars, labelled negative_result but complete data, used); e1:7 (the Borly search, empty for the second run; dropped from dailyEvidence) and e2:1, e2:2 (labelled negative_result although they returned posts, none relevant).
- No price-change (amount_exceeds_cap) failures. Codex accepted the OHLC fields.
- The 72h "recent" sweeps returned results this run (d1:0 and d1:1 delivered), so the discovery gap noted on 2026-10-21 did not apply.
- Slowness, not failure: the Frames batches for e1, e2, f, c and p took 5 to 25 minutes each to complete; the run took several hours of wall time because results had to be polled.

## Panels (Pump and FOMO)

62 batches (p1 to p62), 615 calls planned and called, covering 139 coins (35 constituents and 104 other tracked coins by market cap; 31 further coins skipped by the plan's ceiling, none for the daily budget). Planned 3,782 credits (ceiling 3,800; reserved by other batches 1,080); billed 2,876 credits after refunds. No batch was skipped.

## Billing

Sum of billing.charged_credits over 74 unique run ids: **3,691** credits (discovery d1/d2 32; evidence e1/e2 127; DefiLlama f1 to f6 594; Codex c1/c2 62; panels 2,876). Non-panel part 815 (limit 1,200); total under the 5,000 dailyCreditCeiling and the 10,000 authorization. Account balance 47,151 before the run and 43,507 after (48% of the monthly grant remaining; the balance fell by 3,644, 47 less than the sum of the per-run charges).

## Checks

`npx tsc --noEmit`, `npm run lint`, `node --experimental-strip-types --test tests/frames-data.test.mjs` (12 pass), `npm run build`, `git diff --check` and the credential scan of raw files: pass. The wider `npm test` suite also passes (122 tests).
