import type { Point } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface SparklineProps {
  points: Point[];
  width?: number;
  height?: number;
  /** Stroke color. Defaults to currentColor so the parent decides the tone. */
  color?: string;
  /** Draw a soft gradient fill under the line. */
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
  /** Unique id prefix for the gradient; defaults to a hash of the data. */
  id?: string;
}

function buildPath(values: (number | null)[], w: number, h: number, pad: number): string {
  const n = values.length;
  if (n === 0) return "";
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    if (v === null) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const stepX = n > 1 ? w / (n - 1) : 0;
  let d = "";
  let penDown = false;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v == null) { penDown = false; continue; }
    const x = i * stepX;
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    d += `${penDown ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    penDown = true;
  }
  return d;
}

/**
 * Server-renderable inline SVG sparkline. `preserveAspectRatio="none"` lets it
 * stretch to any box; `vector-effect` keeps the stroke crisp when it does.
 */
export function Sparkline({
  points,
  width = 96,
  height = 28,
  color,
  fill = true,
  strokeWidth = 1.5,
  className,
  id,
}: SparklineProps) {
  const values = points.map((p) => p.value);
  const pad = strokeWidth;
  const path = buildPath(values, width, height, pad);
  const gradId = `spk-${id ?? values.length}-${Math.round((values[0] ?? 0) + (values[values.length - 1] ?? 0))}`;
  const stroke = color ?? "currentColor";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={cn("block overflow-visible", className)}
      aria-hidden
      focusable="false"
    >
      {fill && path && values.every((v) => v !== null) && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path}L${width},${height}L0,${height}Z`} fill={`url(#${gradId})`} stroke="none" />
        </>
      )}
      {path && (
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
