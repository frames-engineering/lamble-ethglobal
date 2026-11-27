<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Verify the production build

With Node 24, run `npm ci`, `npm run lint`, `npm test`, `npm run build`, and
`npm run typecheck`. Start the built app with `npm start -- --port 3100`, then run
`node scripts/deploy/smoke.mjs http://127.0.0.1:3100`. The smoke test uses committed
release data and public routes and needs no provider keys. The same script can
check the live domain without publishing a deployment.
