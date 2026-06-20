"use client";

import { useState } from "react";
import type { OnboardingData } from "./page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";

interface Props {
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function StepPlan({ data, onChange, onNext }: Props) {
  const items = data.monthOnePlan ? data.monthOnePlan.split("\n").filter(Boolean) : [];
  const [draft, setDraft] = useState("");

  function addItem() {
    if (!draft.trim()) return;
    const updated = [...items, draft.trim()];
    onChange({ monthOnePlan: updated.join("\n") });
    setDraft("");
  }

  function removeItem(i: number) {
    const updated = items.filter((_, idx) => idx !== i);
    onChange({ monthOnePlan: updated.join("\n") });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col px-6 pt-12 pb-8">
      <div className="mb-8">
        <p className="text-[#00FF85] text-sm font-semibold mb-2 uppercase tracking-wider">
          Крок 3 — Місяць 1
        </p>
        <h1 className="text-3xl font-black text-white mb-3 leading-tight">
          Що зробиш цього місяця?
        </h1>
        <p className="text-[#6b7280] text-sm leading-relaxed">
          3–5 конкретних дій. Що можеш зробити вже сьогодні?
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto mb-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[#111111] rounded-xl px-4 py-3"
          >
            <span className="text-[#00FF85] font-bold text-sm">{i + 1}.</span>
            <span className="text-white text-sm flex-1">{item}</span>
            <button
              onClick={() => removeItem(i)}
              className="text-[#6b7280] hover:text-[#ef4444] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {items.length < 5 && (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="Напиши конкретну дію..."
              className="bg-[#111111] border-white/10 text-white placeholder:text-white/20 h-12"
            />
            <button
              onClick={addItem}
              className="bg-[#00FF85] text-black rounded-xl px-4 font-bold hover:bg-[#00e876] transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>

      <Button
        onClick={onNext}
        disabled={items.length === 0}
        className="w-full h-14 bg-[#00FF85] text-black font-bold text-base rounded-2xl hover:bg-[#00e876] active:scale-95 transition-all disabled:opacity-40"
      >
        Далі →
      </Button>
    </div>
  );
}
