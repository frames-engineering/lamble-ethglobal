/** Chart series colors (the canvas needs concrete hex values; these match the dark-theme tokens). */
export const SERIES = {
  link: "#4c94ff",
  positive: "#00c278",
  violet: "#e17aff",
  warning: "#efa411",
  negative: "#fd4b4e",
} as const;

/** Distinct colors for multi-series charts, in order. */
export const PALETTE = ["#4c94ff", "#00c278", "#e17aff", "#efa411", "#fd4b4e", "#2fd4c7", "#c8b6ff", "#f78fb3"] as const;
