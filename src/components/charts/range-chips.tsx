"use client";

import { CHART_RANGES, type ChartRange } from "@/components/charts/history-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RangeChipsProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  ranges?: ChartRange[];
  className?: string;
}

export function RangeChips({ value, onChange, ranges = CHART_RANGES, className }: RangeChipsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ChartRange)} className={className}>
      <TabsList variant="chips" aria-label="Chart range">
        {ranges.map((r) => (
          <TabsTrigger key={r} value={r}>
            {r}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
