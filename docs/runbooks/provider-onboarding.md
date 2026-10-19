# Runbook: onboarding a provider capability

Every data capability is registered once in [`docs/data/providers.json`](../data/providers.json), validated
by [`providers.schema.json`](../data/providers.schema.json) plus rule checks, and referred to by key everywhere
else. Code never contains a Frames tool id; inserting an id does not enable anything.

## Steps

1. **Discover (free).** `frames_search_tools` with 2–4 phrasings. Record promising ids under `discovered`
   with the search id and date. Discovered entries have no adapter and no job may call them.
2. **Inspect the descriptor (free).** `frames_get_tool <id>`: inputs, outputs, payment protocol and network,
   price hint, data networks. Note where the payment network differs from the data networks.
3. **Probe (free).** `frames_probe_tools` (≤5 ids per call; `npm run lambo -- providers health --plan` prints
   the list). The live 402 schema wins over the descriptor when they disagree (2026-10-19: x4o2 inputs are
   integers where descriptors said strings, and FOMO lists Robinhood); keep the descriptor in
   `descriptorInputSchema` and the observation date in `liveSchemaObservedAt`.
4. **Add a candidate entry.** Contract, `dataNetworks`, `semantics` (units, coverage, population, timestamps,
   source-reported fields, revisions), pagination, freshness, cost caps, rights (`unknown` until the terms are
   reviewed) and validation status `candidate`. Population matters: a venue's top-holder list is
   `top_holders_sample`, FOMO's holders are `fomo_users`; neither is ever `all_holders`.
5. **One bounded paid smoke call, under an approved budget.** Plan it as a batch request with a small
   `max_usd` and run it with `npm run lambo -- collect` (or in an agent session). The response is retained
   under `research/lamble/<run>/raw/`.
6. **Inspect and map.** `npm run lambo -- providers inspect <capability> <sample>` lists the paths;
   write a field map (items path, fields, units); `providers smoke <capability> <sample> --map <map.json>` runs
   the adapter in validation mode.
7. **Register.** `providers register <capability> --map <map.json> --sample <sample>` writes the verified map
   (`verifiedAgainst` = the sample). Status stays `candidate`.
8. **Validate and enable.** `providers validate` (schema + rules); `providers enable <capability>` succeeds
   only when status is `validated`, an adapter is registered in `src/lib/lambo/adapters/registry.ts` and the
   field map is verified. Then `providers matrix` regenerates the coverage matrix shown on `/sources`.
9. **Rights.** After reviewing the provider's terms, record storage, display and redistribution. Paid API
   bundles include a section only when every source of it has redistribution `permitted`
   (`src/lib/lambo/api/rights.ts`).

## Provider-specific rules already encoded

- x4o2 Pump: holder panels are top-N samples; P&L fields are source-reported; pinned posts are flagged;
  candle depth is `count × resolution` and must be confirmed per coin; timestamps in milliseconds where the
  live schema says so; paid on Base, data on Solana.
- x4o2 FOMO: holders and activity cover FOMO users only; theses are opinions with their author's position.
- Codex: all-pool aggregation per token; missing bars are unknown, never zero, except whole buckets before the
  token's creation time (pre-creation zero rule).
- DefiLlama: use daily series of settled UTC days, never `total24h`; venues that share a fee stream are
  excluded from subtotals and listed.

## Health

`npm run lambo -- providers health --plan` lists the free probes for enabled and candidate capabilities. Results
of the 2026-10-19 probe are in `data/provider-health/2026-10-19.json` (0 credits). When a capability fails,
mark it `blocked` with the reason (the schema requires one); do not pay again until the reason changes.
