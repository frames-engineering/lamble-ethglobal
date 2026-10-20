# Runbook: onboarding a provider capability

Every data capability is registered once in [`docs/data/providers.json`](../data/providers.json), validated
by [`providers.schema.json`](../data/providers.schema.json) plus rule checks, and referred to by key everywhere
else. Code never contains a Frames tool id; inserting an id does not enable anything.

## Steps

1. **Discover (free).** `frames_search_tools` with 2–4 phrasings. Record promising ids under `discovered`
   with the search id and date. Discovered entries have no adapter and no job may call them.
2. **Inspect the descriptor (free).** `frames_get_tool <id>`: inputs, outputs, payment protocol and network,
   price hint, data networks. Note where the payment network differs from the data networks.
3. **Probe (free).** `frames_probe_tools` (≤5 ids per call; `npm run lamble -- providers health --plan` prints
   the list). The live 402 schema wins over the descriptor when they disagree (2026-10-19: x4o2 inputs are
   integers where descriptors said strings, and FOMO lists Robinhood); keep the descriptor in
   `descriptorInputSchema` and the observation date in `liveSchemaObservedAt`.
4. **Add a candidate entry.** Contract, `dataNetworks`, `semantics` (units, coverage, population, timestamps,
   source-reported fields, revisions), pagination, freshness, cost caps, rights (`unknown` until the terms are
   reviewed) and validation status `candidate`. Population matters: a venue's top-holder list is
   `top_holders_sample`, FOMO's holders are `fomo_users`, Pump's holders route is `pump_users`; none is ever
   `all_holders`. Check it against the route's own totals before labelling a list as "top holders".
5. **One bounded paid smoke call, under an approved budget.** Plan it as a batch request with a small
   `max_usd` and run it with `npm run lamble -- collect` (or in an agent session). The response is retained
   under `research/lamble/<run>/raw/`.
6. **Inspect and map.** `npm run lamble -- providers inspect <capability> <sample>` lists the paths;
   write a field map (items path, fields, units); `providers smoke <capability> <sample> --map <map.json>` runs
   the adapter in validation mode.
7. **Register.** `providers register <capability> --map <map.json> --sample <sample>` writes the verified map
   (`verifiedAgainst` = the sample). Status stays `candidate`.
8. **Validate and enable.** `providers validate` (schema + rules); `providers enable <capability>` succeeds
   only when status is `validated`, an adapter is registered in `src/lib/lamble/adapters/registry.ts` and the
   field map is verified. Then `providers matrix` regenerates the coverage matrix shown on `/sources`.
9. **Rights.** After reviewing the provider's terms, record storage, display and redistribution. Paid API
   bundles include a section only when every source of it has redistribution `permitted`
   (`src/lib/lamble/api/rights.ts`).

## Provider-specific rules already encoded

- x4o2 Pump: the holders route lists positions of pump.fun accounts (`pump_users`), not the largest on-chain
  holders: on 2026-10-20 it listed 526 positions for PIERRE against 3,890 holders and a top-10 share of 10.6%
  against the coin route's 25.2%, and rejected `limit: 100` (50 works). Amounts are `{raw, decimals}` objects;
  the trade tape returns the latest 100 trades (about six minutes for an active coin); daily candles carry
  `final` (the open day is `false` and is skipped). P&L fields are source-reported; pinned posts are flagged;
  times are milliseconds; paid on Base, data on Solana.
- x4o2 FOMO: holders and activity cover FOMO users only; theses are opinions with their author's position.
  Candles mark nothing final, so the adapter drops any interval that had not ended at the run time. Frames'
  cross-check refunded candles and lists as "future timestamps" when the latest bucket was the hour in
  progress; the bodies are retained and used at no charge. Frames stores every object under a key named
  `token` as `"[redacted]"`, so FOMO bodies cannot confirm the coin they describe; identity comes from the
  request's chain and address.
- Codex: all-pool aggregation per token; missing bars are unknown, never zero, except whole buckets before the
  token's creation time (pre-creation zero rule).
- DefiLlama: use daily series of settled UTC days, never `total24h`; venues that share a fee stream are
  excluded from subtotals and listed.

## Health

`npm run lamble -- providers health --run` executes the free probes for enabled and candidate capabilities through
`FRAMES_MCP_URL` and reports drift (live arguments versus the catalog contract, quoted price versus the price
hint, descriptor changes since the last run); it never edits the catalog. `--plan` prints the same list for an
agent session. Results
of the 2026-10-19 probe are in `data/provider-health/2026-10-19.json` (0 credits). When a capability fails,
mark it `blocked` with the reason (the schema requires one); do not pay again until the reason changes.
