"use client";

import { cn } from "@/lib/utils";
import { subDays, format } from "date-fns";

export type Period = "7d" | "30d" | "90d" | "180d" | "all";

export const PERIODS: { value: Period; label: string; days?: number }[] = [
  { value: "7d",   label: "7д",   days: 7 },
  { value: "30d",  label: "30д",  days: 30 },
  { value: "90d",  label: "90д",  days: 90 },
  { value: "180d", label: "180д", days: 180 },
  { value: "all",  label: "Все" },
];

export function getPeriodFromDate(period: Period): string {
  const p = PERIODS.find((x) => x.value === period);
  if (!p?.days) return "2024-01-01";
  return format(subDays(new Date(), p.days), "yyyy-MM-dd");
}

interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors",
            value === p.value ? "bg-[#00FF85] text-black" : "bg-[#1a1a1a] text-[#6b7280]"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
