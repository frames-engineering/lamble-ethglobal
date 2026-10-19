/**
 * Canonical identity for tokens and pools.
 *
 * A token is its network plus its full contract or mint address. Symbols and names are display fields:
 * two contracts with the same ticker are different tokens. Solana addresses are base58 and case-sensitive,
 * so they are kept exactly as given. EVM addresses are case-insensitive hex: the canonical form is lowercase,
 * and the address as the source wrote it (for example an EIP-55 checksum) is kept for display.
 */

export const CHAINS = ["solana", "base", "bsc", "ethereum", "arbitrum", "monad", "robinhood", "arc", "xlayer", "unichain"] as const;
export type Chain = (typeof CHAINS)[number];

/** Codex network ids, as used in the research runs (scripts/frames-refresh/normalize.py NETWORK_CHAIN). */
export const CODEX_NETWORK_ID: Record<Chain, number> = {
  solana: 1399811149,
  bsc: 56,
  robinhood: 4663,
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  monad: 143,
  arc: 5042,
  xlayer: 196,
  unichain: 130,
};
export const CHAIN_BY_CODEX_NETWORK: ReadonlyMap<number, Chain> = new Map(
  (Object.entries(CODEX_NETWORK_ID) as [Chain, number][]).map(([chain, id]) => [id, chain]),
);

export const CHAIN_NAME: Record<Chain, string> = {
  solana: "Solana",
  base: "Base",
  bsc: "BNB Chain",
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  monad: "Monad",
  robinhood: "Robinhood Chain",
  arc: "Arc",
  xlayer: "X Layer",
  unichain: "Unichain",
};

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** Uniswap v4 and similar pools are identified by a bytes32 pool id, not a contract address. */
const EVM_POOL_ID = /^0x[0-9a-fA-F]{64}$/;

export class IdentityError extends Error {
  readonly code: "unknown_chain" | "invalid_address";
  constructor(code: "unknown_chain" | "invalid_address", message: string) {
    super(message);
    this.code = code;
  }
}

export function isChain(value: string): value is Chain {
  return (CHAINS as readonly string[]).includes(value);
}

export function isEvmChain(chain: Chain): boolean {
  return chain !== "solana";
}

export interface TokenIdentity {
  chain: Chain;
  /** Canonical address: Solana exactly as given, EVM lowercase. */
  address: string;
  /** Address as the source wrote it. */
  displayAddress: string;
  /** `${chain}:${address}` — the only key used to join token data. */
  id: string;
}

export function tokenIdentity(chain: string, address: string): TokenIdentity {
  if (!isChain(chain)) throw new IdentityError("unknown_chain", `Unknown chain: ${chain}`);
  const raw = address.trim();
  if (chain === "solana") {
    if (!BASE58.test(raw)) throw new IdentityError("invalid_address", `Not a Solana mint address: ${raw}`);
    return { chain, address: raw, displayAddress: raw, id: `${chain}:${raw}` };
  }
  if (!EVM_ADDRESS.test(raw)) throw new IdentityError("invalid_address", `Not an EVM contract address: ${raw}`);
  const canonical = raw.toLowerCase();
  return { chain, address: canonical, displayAddress: raw, id: `${chain}:${canonical}` };
}

/** Parses `${chain}:${address}`; the address part may itself not contain a colon. */
export function parseTokenId(id: string): TokenIdentity {
  const at = id.indexOf(":");
  if (at < 1) throw new IdentityError("invalid_address", `Not a token id: ${id}`);
  return tokenIdentity(id.slice(0, at), id.slice(at + 1));
}

export function tryTokenIdentity(chain: string, address: string): TokenIdentity | null {
  try {
    return tokenIdentity(chain, address);
  } catch {
    return null;
  }
}

export interface PoolIdentity {
  chain: Chain;
  pool: string;
  kind: "solana-account" | "evm-contract" | "evm-pool-id";
  id: string;
}

export function poolIdentity(chain: string, pool: string): PoolIdentity {
  if (!isChain(chain)) throw new IdentityError("unknown_chain", `Unknown chain: ${chain}`);
  const raw = pool.trim();
  if (chain === "solana") {
    if (!BASE58.test(raw)) throw new IdentityError("invalid_address", `Not a Solana pool account: ${raw}`);
    return { chain, pool: raw, kind: "solana-account", id: `${chain}:${raw}` };
  }
  if (EVM_ADDRESS.test(raw)) return { chain, pool: raw.toLowerCase(), kind: "evm-contract", id: `${chain}:${raw.toLowerCase()}` };
  if (EVM_POOL_ID.test(raw)) return { chain, pool: raw.toLowerCase(), kind: "evm-pool-id", id: `${chain}:${raw.toLowerCase()}` };
  throw new IdentityError("invalid_address", `Not an EVM pool address or pool id: ${raw}`);
}

/** URL segment form used by /coins/[chain]/[address]; identical to the canonical address. */
export function coinPath(identity: Pick<TokenIdentity, "chain" | "address">): string {
  return `/coins/${identity.chain}/${identity.address}`;
}
