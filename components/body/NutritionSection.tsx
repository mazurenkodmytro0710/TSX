"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { NutritionLog, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const STATUS_OPTIONS = [
  { value: "done", label: "✅ Виконав норму", color: "border-[#00FF85] bg-[#00FF85]/10 text-[#00FF85]" },
  { value: "underate", label: "⚠️ Недобір калорій / білка", color: "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]" },
  { value: "cheat", label: "❌ Зірвався з раціону", color: "border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]" },
] as const;

export function NutritionSection() {
  const [log, setLog] = useState<NutritionLog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [note, setNote] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: prof }, { data: lg }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("nutrition_logs").select("*").eq("user_id", user.id).eq("date", today).single(),
    ]);

    setProfile(prof);
    if (lg) {
      setLog(lg);
      setNote(lg.note ?? "");
      setCalories(lg.calories_actual?.toString() ?? "");
      setProtein(lg.protein_actual?.toString() ?? "");
    }
  }

  async function setStatus(status: "done" | "underate" | "cheat") {
    if (navigator.vibrate) navigator.vibrate(10);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("nutrition_logs")
      .upsert(
        {
          user_id: user.id,
          date: today,
          status,
          note: note || null,
          calories_actual: calories ? parseInt(calories) : null,
          protein_actual: protein ? parseInt(protein) : null,
        },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();

    setLog(data);
  }

  const calGoal = profile?.calorie_goal ?? 2800;
  const protGoal = profile?.protein_goal ?? 180;
  const calVal = log?.calories_actual ?? 0;
  const protVal = log?.protein_actual ?? 0;
  const calPct = Math.min((calVal / calGoal) * 100, 100);
  const protPct = Math.min((protVal / protGoal) * 100, 100);

  const R = 85;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-4 pb-6">
      {/* Calorie Ring */}
      <div className="bg-[#111111] rounded-2xl p-5 flex flex-col items-center gap-4">
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          <svg className="-rotate-90" width="200" height="200">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#1a1a1a" strokeWidth="14" />
            <circle
              cx="100" cy="100" r={R} fill="none" stroke="#00FF85" strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - calPct / 100)}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-white font-black text-3xl">{calVal}</p>
            <p className="text-[#6b7280] text-xs">/ {calGoal} ккал</p>
          </div>
        </div>
        <div className="w-full space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-[#6b7280]">Білок</span>
              <span className="text-white font-semibold">{protVal}/{protGoal}г</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00FF85] rounded-full transition-all duration-700"
                style={{ width: `${protPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[#6b7280] text-xs mb-1">Калорії</p>
              <input
                type="number"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder={calGoal.toString()}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
              />
            </div>
            <div>
              <p className="text-[#6b7280] text-xs mb-1">Білок (г)</p>
              <input
                type="number"
                inputMode="numeric"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder={protGoal.toString()}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status buttons */}
      <div className="space-y-2">
        {STATUS_OPTIONS.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={cn(
              "w-full h-[52px] rounded-2xl border-2 font-semibold text-sm transition-all active:scale-95",
              log?.status === value ? color : "border-white/10 text-white/50 bg-[#111111]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Note */}
      {log?.status && (
        <div className="space-y-2 animate-fade-in">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => log && setStatus(log.status as "done" | "underate" | "cheat")}
            placeholder="Нотатка про харчування (необов'язково)..."
            rows={2}
            className="bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none text-sm"
          />
        </div>
      )}
    </div>
  );
}
