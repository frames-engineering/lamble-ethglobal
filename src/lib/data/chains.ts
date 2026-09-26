import type { ChainId } from "./types";

export interface ChainInfo {
  id: ChainId;
  name: string;
  /** 1–2 letter glyph used by ChainMark. */
  short: string;
  /** Brand color for the glyph background. */
  color: string;
  /** Text color on top of `color`. */
  fg: string;
}

export const CHAINS: Record<ChainId, ChainInfo> = {
  solana: { id: "solana", name: "Solana", short: "S", color: "#9945ff", fg: "#ffffff" },
  base: { id: "base", name: "Base", short: "B", color: "#0052ff", fg: "#ffffff" },
  bsc: { id: "bsc", name: "BNB Chain", short: "BNB", color: "#f0b90b", fg: "#14151b" },
  ethereum: { id: "ethereum", name: "Ethereum", short: "E", color: "#627eea", fg: "#ffffff" },
  arbitrum: { id: "arbitrum", name: "Arbitrum", short: "A", color: "#28a0f0", fg: "#ffffff" },
  monad: { id: "monad", name: "Monad", short: "M", color: "#836ef9", fg: "#ffffff" },
  robinhood: { id: "robinhood", name: "Robinhood Chain", short: "R", color: "#00c805", fg: "#14151b" },
  arc: { id: "arc", name: "Arc", short: "AR", color: "#1f6feb", fg: "#ffffff" },
  xlayer: { id: "xlayer", name: "X Layer", short: "X", color: "#202127", fg: "#ffffff" },
  unichain: { id: "unichain", name: "Unichain", short: "U", color: "#f50db4", fg: "#ffffff" },
};

export const CHAIN_ORDER: ChainId[] = [
  "solana",
  "base",
  "bsc",
  "ethereum",
  "arbitrum",
  "monad",
  "robinhood",
  "arc",
  "xlayer",
  "unichain",
];

export function chainInfo(id: ChainId): ChainInfo {
  return CHAINS[id];
}
