import type { NarrativeCategory, NarrativeStatus, SignalSource } from "@/lib/data/types";

export const CATEGORY_LABEL: Record<NarrativeCategory, string> = {
  "ai-agents": "AI agents",
  politifi: "PolitiFi",
  animals: "Animals",
  culture: "Culture",
  infra: "Ecosystems",
  stonks: "Stonks",
};

export const STATUS_META: Record<NarrativeStatus, { label: string; variant: "positive" | "warning" | "neutral" }> = {
  heating: { label: "Heating up", variant: "positive" },
  peak: { label: "At peak", variant: "warning" },
  cooling: { label: "Cooling", variant: "neutral" },
};

export const SOURCE_GLYPH: Record<SignalSource, string> = {
  onchain: "⛓",
  x: "𝕏",
  launchpad: "◎",
  newswire: "≡",
};
