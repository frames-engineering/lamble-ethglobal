/** Opens the bot with a draft; the user still sends the message in Telegram. */
export const LAUNCH_BOT_URL = `https://t.me/wenlamblebot?text=${encodeURIComponent("I want to launch a token")}`;

/** Frames' public site. Configurable because the product URL is owned outside this repository. */
export const FRAMES_URL = process.env.NEXT_PUBLIC_FRAMES_URL ?? "https://frames.ag";

/** Canonical site origin for metadata, sitemaps, feeds and API examples. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Frames MCP connection URL for agent setup instructions. Unset by default: the URL is issued by Frames and is
 * not published in this repository, so pages tell readers to take it from their Frames account instead.
 */
export const FRAMES_MCP_URL = process.env.NEXT_PUBLIC_FRAMES_MCP_URL ?? null;

/** Optional intake for coverage requests (an issue form or similar). Unset: pages offer copyable request text only. */
export const COVERAGE_REQUEST_URL = process.env.NEXT_PUBLIC_LAMBO_COVERAGE_REQUEST_URL ?? null;

/**
 * Whether this API has been confirmed as listed in the Frames catalog. Set to "listed" only after an operator
 * has found it with Frames search; pages otherwise say plainly that it is not listed.
 */
export const FRAMES_LISTED = process.env.NEXT_PUBLIC_LAMBO_FRAMES_LISTING === "listed";
