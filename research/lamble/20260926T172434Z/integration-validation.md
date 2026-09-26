# Landing integration validation

The active provider serves the generated Frames financial/narrative snapshot plus
metadata enrichment from `../20260926T175634Z/`. No deployment or recurring job was
created. Original landing copy is retained and research banners are removed.

Passed: production build, TypeScript, lint, five offline regression tests, and diff
whitespace checks. Browser checks confirmed both measured narrative charts, URL
selection, table sorting/filtering/details, all 19 chain records and 13 loaded
local logos. Supported chains remain distinct from financial metric coverage.

Unknown values remain unavailable. Engine/frontend financial flows are not summed.
Coin percentages retain explicit measured pool-volume semantics in their tooltips.

Refresh instructions: `src/lib/data/snapshots/README.md`.
Further evidence, costs and remaining gaps: `../20260926T175634Z/report.md`.
