"use client";

import { useState } from "react";
import { NutritionSection } from "@/components/body/NutritionSection";
import { WorkoutSection } from "@/components/body/WorkoutSection";
import { MeasurementsSection } from "@/components/body/MeasurementsSection";
import { cn } from "@/lib/utils";

type BodyTab = "nutrition" | "workout" | "measurements";

const TABS: { value: BodyTab; label: string }[] = [
  { value: "nutrition", label: "Харчування" },
  { value: "workout", label: "Тренування" },
  { value: "measurements", label: "Заміри" },
];

export default function BodyPage() {
  const [tab, setTab] = useState<BodyTab>("nutrition");

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0a0a0a] pt-safe">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-black text-white">💪 Тіло</h1>
      </header>

      {/* Segmented control — full width, single row */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#1a1a1a] rounded-2xl mx-4 mt-2 mb-4">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "py-2.5 rounded-xl text-xs font-semibold transition-all",
              tab === value
                ? "bg-[#00FF85] text-black"
                : "text-[#6b7280]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content — full width below tabs */}
      <div className="px-4 pb-24">
        {tab === "nutrition" && <NutritionSection />}
        {tab === "workout" && <WorkoutSection />}
        {tab === "measurements" && <MeasurementsSection />}
      </div>
    </div>
  );
}
