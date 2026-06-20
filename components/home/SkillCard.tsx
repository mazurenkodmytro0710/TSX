"use client";

import type { Skill } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: Skill;
  status: "pending" | "done" | "failed";
  onToggle: () => void;
}

const STATUS_ICONS = {
  pending: "○",
  done: "✓",
  failed: "✗",
};

export function SkillCard({ skill, status, onToggle }: SkillCardProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative w-full h-[140px] rounded-2xl p-4 flex flex-col items-start justify-between transition-all active:scale-95",
        "bg-[#111111] border",
        status === "done"
          ? "border-[#00FF85]/50 shadow-[0_0_20px_#00FF8520]"
          : status === "failed"
          ? "border-[#ef4444]/30"
          : "border-white/5"
      )}
    >
      <div className="flex items-start justify-between w-full">
        <span className="text-3xl">{skill.icon}</span>
        <span
          className={cn(
            "text-xl font-bold",
            status === "done"
              ? "text-[#00FF85]"
              : status === "failed"
              ? "text-[#ef4444]"
              : "text-white/30"
          )}
        >
          {STATUS_ICONS[status]}
        </span>
      </div>

      <div>
        <p className="text-white font-semibold text-sm leading-tight">{skill.name}</p>
        <p
          className={cn(
            "text-xs mt-0.5",
            status === "done"
              ? "text-[#00FF85]"
              : status === "failed"
              ? "text-[#ef4444]"
              : "text-white/30"
          )}
        >
          {status === "done" ? "Виконано" : status === "failed" ? "Пропущено" : "Очікує"}
        </p>
      </div>

      {status === "done" && (
        <div className="absolute inset-0 rounded-2xl bg-[#00FF85]/5 pointer-events-none" />
      )}
    </button>
  );
}
