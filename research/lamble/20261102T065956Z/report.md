# Daily refresh 2026-11-02 (run 20261102T065956Z)

Run time 2026-11-02 06:59 UTC. Financial anchor (exclusive end) **2026-11-02**, one day after the prior run's 2026-11-01, so `normalize.py` ran with `--prior research/lamble/20261101T065822Z` and no separate narrative baseline. Chart anchor 2026-11-02 05:00 UTC; 30 complete UTC days of daily bars (168 reconciled days, max relative gap 5.2e-10 against hourly sums); 28 pools; 1,002 pre-creation zero buckets. Release published: rel-20261102T065956Z-74616594. Today is a Monday: the 2026-W44 weekly edition was written (revision 1, complete); 2026-W43 stays frozen. Articles: daily-2026-11-02 and state-of-the-trenches-2026-w44 written; coin-owl-solana-68agsj-2026-w45 and narrative-stock-paired-coins-2026-w45 pinned.

## New narratives (0)

No story met `narrativeRules.newNarrative` today. Both theme clusters were resolved and the strongest leads stay deferred (details below).

## Cluster decisions (2, recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-american | deferred | Oil and dividend fund family, day 12. Three unflagged copies now meet the member bar and their own metadata names the story: XTO (qAnrQZ..., $3.12M volume, $1.19M market cap, "The first coin in history that pays you $USO. Oil investing, open to every American."), AODF (pfQBdL..., $2.45M, $3.63M, "American Oil Dividend Fund") and a second XTO (VWmjd6..., $2.33M, $646K). The independent-source test fails: e2:0 and e3:0 return only trader call posts, scanner bots and one unsourced post claiming the United States will inject $500 billion on 18 November; e3:1 contains a post saying claims about oil reserves and dividends remain unverified; replies to the XTO account include "scam" and "rug pull"; a search for the account's own posts (e4) returned nothing. No news item or official page names these coins. The other copies (USOE, FOTF, UDTF, AOTF, UODF, USDP) are flagged implausible-cap-for-new-pool or extreme-24h-move and are quarantined. |
| k-paired | rejected | BABYPUMP ("Baby Pump paired $PUMP"), RETARD ("Paired to LLY") and VADER ("paired with $Anakin") share the word "paired" with three different partners (a coin, a stock, another meme coin). RETARD is a stock-paired coin and was added to that narrative instead. e2:1 returned only call-group and vote-farming posts. |

Leads re-evaluated (candidates in curation.json):
- **Anakin lead (deferred, day 1; strongest new lead).** A headline, "Experts are concerned that Anakin Skywalker is becoming a symbol of right-wing extremism", went viral on X from 2026-10-31 (e5; no post names an outlet; the 2026-11-02 Leading Report post has about 226K views). ANAKIN (Anakin Coin, Pump.fun, 8s4bNq..., pool opened 2026-11-01 22:28 UTC) repeats the headline as its description: $4.81M volume, $3.26M market cap. Anakin Skywalker (Pump.fun, ExxzYB..., pool opened 2026-10-31 18:10 UTC) has an empty description but its name is the subject: $953,897 volume, $3.12M market cap. Darth Vader (VADER, 9XHBZs...) says "paired with $Anakin" but has a $40,542 market cap, under the $100K addMember bar, so only two coins qualify and the three-coin minimum is not met. A search for the Anakin story was added to dailyEvidence (e1 becomes 10 calls).
- **Oil and dividend fund family** (see k-american). Owner judgment: three unflagged copies, about $7.9M combined volume, and no independent source after 12 days.
- **Apple theme (AAPLCAT, iTech, iCoin):** did not appear in today's sweep; status unchanged (deferred).
- **BNB / Broke Nigga Baddie:** unchanged (deferred for the owner).
- **Claude (Clanker V4, Robinhood Chain):** rejected again ($166,705 volume).
- **PEACE (two same-ticker coins, $3.4M volume, empty descriptions), Paper (single perpetuals-exchange coin, $43.7M volume):** rejected, no shared story. **USDF:** counted with the oil family lead.

## Member and narrative changes

- **Added to Coins paired with tokenized stocks:** RETARD (Retardatide, StonkFun, ACv7iJ...): "Elons Retardatide Prophecy. Paired to LLY. You get paid LLY stock just for holding retardatide." ($259,841 volume, $285,989 market cap, 59.9 hours old). CHAD (CHAD, LaunchLab, 3jAHcV...): "Backed by tokenized HIMS stock." ($862,819 volume, $422,009 market cap, 10.7 hours old). Both claims are the coins' own and are not verified.
- **Archived (under $1,000 on two consecutive observations):** ANTS (Pump.fun, Vbj43i...) from Anthropic IPO coins ($177 in the prior chart window, $21 now) and the $19 coin (Pump.fun, pa6bZZ...) from Binance hack coins (under $1, then $5). Collection stops; memberships stay open.
- No coin removed under removedMembers; no narrative retired, paused or resumed.
- Registry: `poolUniverse` has 28 pools (2 added, 2 removed). e1 is 9 calls today and becomes 10 tomorrow with the Anakin search.
- Story searches: 16 X searches (e1 9, e2 2, e3 3, e4 1 refunded, e5 1) and no page scrapes (limits 24 and 6).
- Watch items: Anthropic IPO coins ($128,036 chart-window volume) and Lightberry Lumi coins ($85,290, under the $100,000 retirement threshold for the first time) are close to the pause rule; the Base Anthropic coin's rolling 24h volume in d1 was $617.

## Data changes vs yesterday (run 20261101T065822Z)

- **Covered fee subtotal** (14 included venues): **$2,180,831** against $2,159,468 (+1.0%). Financial anchor 2026-11-02 against 2026-11-01. No revisions.
- **Indexed launches** 24h: **48,360** against 41,563 (+16.4%). **Completions** 24h: **3,229** against 3,105 (+4.0%). 14 creation venues, 11 completion venues.
- **Windowed sums** over launchpads with data (18 venues for fees and revenue, 15 for creator earnings, as yesterday).

| Window | Fees | Revenue | Creator earnings |
|---|---|---|---|
| 24h | $2.31M (yesterday $2.24M) | $1.26M ($1.19M) | $1.05M, 15 venues ($1.05M, 15) |
| 7d | $21.18M ($21.49M) | $10.84M ($10.94M) | $10.34M ($10.55M) |
| 30d | $112.37M ($116.61M) | $56.32M ($57.91M) | $56.04M ($58.69M) |

Creator earnings by venue, 24h: pump.fun $386,050 ($432,040), Flap $383,226 ($392,578), Pons $135,958 ($125,571), LaunchLab $71,459 ($38,849), Meteora DBC $29,742 ($28,761).

- **Narratives.** 24h chart-window volume to 05:00 UTC, change on the preceding window, and 30-day volume of current members.

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Coins paired with tokenized stocks | 6 | $8.42M | -11.7% | $483.37M |
| Zcash launchpad coins | 4 | $1.19M | -33.1% | $59.24M |
| Super Intelligence coins | 10 | $0.85M | -2.8% | $214.00M |
| Binance hack coins | 3 | $0.67M | -69.5% | $37.61M |
| Anthropic IPO coins | 3 | $0.13M | -99.8% | $63.86M |
| Lightberry Lumi coins | 2 | $0.09M | -96.8% | $7.25M |

The Anthropic IPO and Binance hack drops follow yesterday's launch-day spike in the Base Anthropic coin (about $57M of yesterday's $57.05M) and the cooling of the hack coins. Stock-paired 24h (current members, including the two new coins) is $8.42M. Yesterday's 30-day figures (members at the time): stock-paired $497.59M, Binance $37.26M, Lightberry $7.13M, Zcash $75.36M, Super Intelligence $239.24M, Anthropic $65.17M.

- **Volume caveats:** none shown today (no volumeCaveat on any narrative).

## Story changes

- Anthropic IPO coins: S-1 reports of 2026-10-26 stand; a 2026-11-02 post reports a Japan share sale of up to $3.5B ahead of the Nasdaq IPO and a 2026-10-28 moomoo post says a roadshow could begin the week of 9 November with a debut 16-20 November (reports in posts, not verified here).
- Binance hack coins: 2026-11-02 posts say Binance restored 95% of affected assets and is reopening withdrawals in phases, with more than $4B withdrawn after resumption and $5.8B net outflows in 24 hours per DefiLlama (reports in posts, not verified here).
- Lightberry Lumi coins: Lightberry's 2026-10-30/31 conditional approval from the Department of War and FCC Covered List exemption stands; no new development.
- Stock-paired coins: two more coins joined (above); a 2026-11-02 post reports Tokenized funds live on StonkBrokers (a Robinhood Chain fund product, not counted).
- Other narratives: no change.

## Failures, refunds and billing

- 680 calls requested, 523 delivered. The 157 undelivered calls were refunded or not charged (97 seller_error, 50 negative_result, 7 caller_error and 3 with no outcome recorded). They are almost all panel calls: FOMO market panels returning TOKEN_UNSUPPORTED, empty holder lists, and candles/activity bodies with timestamps the cross-check called future. The c1 market snapshot call (filterTokens) was refunded because the cross-check misread createdAt timestamps as future; its body is retained and valid. e4 (from:XTruthOil) returned no tweets and was refunded.
- One panel body (p4 call 9, FOMO holders for GTA6, 207,484 characters) came back as a body_ref; it was fetched in four free pages and written back into raw/p4.json without any change to its content.
- **Billed credits: 3,586** (validation-report.json): discovery d1 25, d2 7, e1 97, e2 11, e3 33, e4 0, e5 11; collect f1-f6 616, c1 31, c2 19; panels 2,736 across 60 batches (136 coins: 28 constituents plus 108 others; 66 coins skipped for the planner's ceiling; plannedCredits 3,647, reservedByOtherBatchesCredits 1,330). No batch was skipped for the budget. Frames usage moved from 122,834 to 119,291 available credits (3,543; the 43-credit gap is the ledger's own rounding against the per-run bills). Daily budget 10,000.
