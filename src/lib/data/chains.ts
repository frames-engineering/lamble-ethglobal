import type { ChainId } from "./types";

/** Icons live in `public/chains/<id>.svg`. */
export interface ChainInfo {
  id: ChainId;
  name: string;
}

export const CHAINS: Record<ChainId, ChainInfo> = {
  solana: { id: "solana", name: "Solana" },
  base: { id: "base", name: "Base" },
  bsc: { id: "bsc", name: "BNB Chain" },
  ethereum: { id: "ethereum", name: "Ethereum" },
  arbitrum: { id: "arbitrum", name: "Arbitrum" },
  monad: { id: "monad", name: "Monad" },
  robinhood: { id: "robinhood", name: "Robinhood Chain" },
  arc: { id: "arc", name: "Arc" },
  xlayer: { id: "xlayer", name: "X Layer" },
  unichain: { id: "unichain", name: "Unichain" },
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
