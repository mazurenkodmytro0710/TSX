"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { NutritionLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { awardXP } from "@/lib/achievements";
import { XP_REWARDS } from "@/lib/xp";

const STATUS_OPTIONS = [
  {
    value: "done" as const,
    label: "✅ Виконав норму",
    active: "bg-green-500 text-white",
    idle: "bg-green-500/10 text-green-400 border border-green-500/30",
  },
  {
    value: "underate" as const,
    label: "⚠️ Недобір",
    active: "bg-yellow-500 text-white",
    idle: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  },
  {
    value: "cheat" as const,
    label: "❌ Зірвався",
    active: "bg-red-500 text-white",
    idle: "bg-red-500/10 text-red-400 border border-red-500/30",
  },
];

export function NutritionSection() {
  const [log, setLog] = useState<NutritionLog | null>(null);
  const [note, setNote] = useState("");
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: lg } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();
    if (lg) {
      setLog(lg);
      setNote(lg.note ?? "");
    }
  }

  async function saveNutrition(status: "done" | "underate" | "cheat") {
    if (navigator.vibrate) navigator.vibrate(10);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("nutrition_logs")
      .upsert(
        { user_id: user.id, date: today, status, note: note || null },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();
    setLog(data);
    if (status === "done") {
      await awardXP(user.id, XP_REWARDS.NUTRITION_DONE, "Харчування виконано");
    }
  }

  async function saveNote() {
    if (!log) return;
    await saveNutrition(log.status as "done" | "underate" | "cheat");
  }

  const status = log?.status;

  return (
    <div className="flex flex-col items-center px-4 pb-6">
      <p className="text-gray-400 text-sm mt-6 mb-8 text-center">
        Як пройшло харчування сьогодні?
      </p>

      <div className="flex flex-col gap-3 w-full">
        {STATUS_OPTIONS.map(({ value, label, active, idle }) => (
          <button
            key={value}
            onClick={() => saveNutrition(value)}
            className={cn(
              "w-full h-[64px] rounded-2xl text-base font-semibold flex items-center justify-center gap-3 transition-all active:scale-95",
              status === value ? active : idle
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {status && (
        <div className="w-full mt-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder="Нотатка (необов'язково)..."
            className="w-full bg-[#1a1a1a] rounded-2xl p-4 text-sm text-white placeholder:text-gray-600 outline-none resize-none h-[80px]"
          />
        </div>
      )}

      {status && (
        <p className="text-xs text-gray-600 mt-3">Збережено сьогодні</p>
      )}
    </div>
  );
}
