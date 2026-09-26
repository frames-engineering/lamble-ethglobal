import { cn } from "@/lib/utils";

type Size = 16 | 20 | 24 | 28 | 34 | 40;

interface LetterMarkProps {
  /** Text whose first character becomes the glyph. */
  name: string;
  color: string;
  size?: Size;
  /** Optional local image; falls back to the letter when absent. */
  src?: string;
  className?: string;
}

const FONT: Record<Size, string> = {
  16: "text-[9px]",
  20: "text-[10px]",
  24: "text-[11px]",
  28: "text-xs",
  34: "text-[13px]",
  40: "text-[15px]",
};

/** Relative luminance (sRGB) → pick dark or light glyph color. */
export function contrastText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m || !m[1]) return "#ffffff";
  const n = parseInt(m[1], 16);
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
  return L > 0.42 ? "#14151b" : "#ffffff";
}

/** Brand-colored circle with the first letter of `name`, like the pen design. */
export function LetterMark({ name, color, size = 34, src, className }: LetterMarkProps) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-med font-semibold leading-none",
        FONT[size],
        className,
      )}
      style={{ width: size, height: size, backgroundColor: src ? undefined : color, color: contrastText(color) }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
