"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { NutritionLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/Toaster";
import { awardXP } from "@/lib/achievements";
import { XP_REWARDS } from "@/lib/xp";

const STATUS_OPTIONS = [
  { value: "done" as const,     icon: "✅", label: "Норм",      color: "#00FF85" },
  { value: "underate" as const, icon: "⚠️", label: "Недобір",   color: "#f59e0b" },
  { value: "cheat" as const,    icon: "❌", label: "Зірвався",  color: "#ef4444" },
];

export function NutritionSection() {
  const [log, setLog] = useState<NutritionLog | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"done" | "underate" | "cheat" | null>(null);
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
      setStatus(lg.status as typeof status);
    }
  }

  async function save() {
    if (!status) return;
    if (navigator.vibrate) navigator.vibrate(10);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("nutrition_logs")
      .upsert(
        { user_id: user.id, date: today, status, note: note.trim() || null },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();
    setLog(data);
    if (status === "done") {
      await awardXP(user.id, XP_REWARDS.NUTRITION_DONE, "Харчування виконано");
    }
    showToast("Харчування збережено ✓");
  }

  return (
    <div className="bg-[#111111] rounded-2xl p-5">
      <p className="text-white font-bold text-base mb-4">🥗 Харчування сьогодні</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={cn(
              "flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all active:scale-95",
              status === opt.value ? "border-current bg-current/10" : "border-white/10 bg-[#1a1a1a]"
            )}
            style={status === opt.value ? { borderColor: opt.color, color: opt.color } : {}}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="text-xs font-medium">{opt.label}</span>
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => { if (log && status) save(); }}
        placeholder="Що їв сьогодні? (необов'язково)"
        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-white text-sm outline-none resize-none h-[80px] placeholder:text-[#6b7280]"
        style={{ fontSize: "16px" }}
      />

      <Button
        onClick={save}
        disabled={!status}
        className="w-full mt-3 h-11 bg-[#00FF85] text-black font-semibold rounded-xl disabled:opacity-40"
      >
        Зберегти
      </Button>

      {log?.status && (
        <p className="text-xs text-[#6b7280] mt-2 text-center">
          Збережено: {STATUS_OPTIONS.find((o) => o.value === log.status)?.label}
        </p>
      )}
    </div>
  );
}
