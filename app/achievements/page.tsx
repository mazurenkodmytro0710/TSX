"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { BottomSheet } from "@/components/layout/BottomSheet";

const HOW_TO_UNLOCK: Record<string, string> = {
  streak_3: "Виконуй хоча б одну звичку 3 дні підряд",
  streak_7: "Виконуй звички 7 днів підряд",
  streak_14: "14 днів підряд без пропуску",
  streak_30: "30 днів підряд — місяць без зупинки",
  streak_60: "60 днів підряд",
  streak_90: "90 днів підряд — квартал",
  streak_180: "180 днів підряд — пройди весь сезон",
  first_workout: "Запиши перше тренування у вкладці Тіло",
  workouts_10: "Запиши 10 тренувань загалом",
  workouts_30: "Запиши 30 тренувань загалом",
  workouts_60: "Запиши 60 тренувань загалом",
  first_pr: "Встанови особистий рекорд у вправі",
  pr_5: "Встанови 5 особистих рекордів",
  pr_20: "Встанови 20 особистих рекордів",
  deepwork_first: "Запиши першу Deep Work сесію у Фокус",
  deepwork_10h: "Накопичи 10 годин Deep Work загалом",
  deepwork_50h: "Накопичи 50 годин Deep Work загалом",
  deepwork_200h: "Накопичи 200 годин Deep Work загалом",
  deepwork_5h_day: "Запиши 5+ годин Deep Work за один день",
  first_transaction: "Запиши першу транзакцію у Фінанси",
  transactions_30: "Запиши 30 транзакцій",
  transactions_100: "Запиши 100 транзакцій",
  first_saving: "Відклади гроші на накопичувальний рахунок",
  first_measurement: "Внеси перші заміри тіла у Тіло → Заміри",
  measurements_4: "Вноси заміри 4 тижні підряд",
  measurements_12: "Вноси заміри 12 тижнів підряд",
  first_note: "Напиши першу нотатку у розділі Нотатки",
  notes_10: "Напиши 10 нотаток",
  notes_50: "Напиши 50 нотаток",
  first_voice: "Запиши першу голосову нотатку",
  perfect_day: "Виконай усі звички всіх скілів за один день",
  perfect_week: "Зроби ідеальний день 7 разів",
  perfect_month: "Зроби ідеальний день 30 разів",
  night_owl: "Лягай до 23:00 — 14 разів",
  no_phone: "Обмежуй екран 14 разів",
  social_hero: "Виконай соціальну звичку 20 разів",
  level_10: "Досягни 10 рівня (набери достатньо XP)",
  level_20: "Досягни 20 рівня — стань легендою сезону",
  all_skills: "Виконай всі скіли за один тиждень",
  comeback: "Відновив стрік після паузи",
};

const RARITY_LABEL_FULL: Record<string, string> = {
  common: "⚪ Звичайне",
  rare: "🔷 Рідкісне",
  epic: "💎 Епічне",
  legendary: "⭐ Легендарне",
};

type Filter = "all" | "unlocked" | "locked";

const RARITY_BORDER: Record<string, string> = {
  common: "border-white/10",
  rare: "border-blue-500/40",
  epic: "border-purple-500/40",
  legendary: "border-yellow-500/60",
};

const RARITY_LABEL: Record<string, string> = {
  common: "Звичайне",
  rare: "Рідкісне",
  epic: "Епічне",
  legendary: "Легендарне",
};

type Achievement = typeof ALL_ACHIEVEMENTS[number];

export default function AchievementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [unlockedKeys, setUnlockedKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Achievement | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_achievements")
        .select("achievement_key, unlocked_at")
        .eq("user_id", user.id);
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.achievement_key] = row.unlocked_at;
      setUnlockedKeys(map);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = ALL_ACHIEVEMENTS.filter((a) => {
    if (filter === "unlocked") return !!unlockedKeys[a.key];
    if (filter === "locked") return !unlockedKeys[a.key];
    return true;
  });

  const unlockedCount = Object.keys(unlockedKeys).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} className="text-[#6b7280] p-1 -ml-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Досягнення</h1>
          <p className="text-[#6b7280] text-xs">{unlockedCount} / {ALL_ACHIEVEMENTS.length} розблоковано</p>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#1a1a1a] rounded-2xl mx-4 mb-4">
        {(["all", "unlocked", "locked"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "py-2 rounded-xl text-xs font-semibold transition-all",
              filter === f ? "bg-[#00FF85] text-black" : "text-[#6b7280]"
            )}
          >
            {f === "all" ? "Всі" : f === "unlocked" ? "Розблоковані" : "Заблоковані"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-[#00FF85] animate-pulse font-black">T6X</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4 pb-24">
          {filtered.map((a) => {
            const unlockedAt = unlockedKeys[a.key];
            const isUnlocked = !!unlockedAt;
            return (
              <button
                key={a.key}
                onClick={() => setSelected(a)}
                className={cn(
                  "bg-[#111111] rounded-2xl p-3 flex flex-col items-center text-center border active:scale-95 transition-all",
                  RARITY_BORDER[a.rarity],
                  !isUnlocked && "opacity-50"
                )}
              >
                <div className={cn("text-3xl mb-1.5", !isUnlocked && "grayscale")}>
                  {isUnlocked ? a.icon : "🔒"}
                </div>
                <p className="text-white text-[11px] font-semibold leading-tight mb-1">{a.name}</p>
                <p className="text-[#6b7280] text-[10px] leading-tight">
                  {isUnlocked ? a.description : "???"}
                </p>
                {isUnlocked ? (
                  <p className="text-[#00FF85] text-[9px] mt-1.5 font-semibold">
                    +{a.xp_reward} XP
                  </p>
                ) : (
                  <p className="text-[#4b5563] text-[9px] mt-1.5 uppercase tracking-wider">
                    {RARITY_LABEL[a.rarity]}
                  </p>
                )}
                {isUnlocked && (
                  <p className="text-[#4b5563] text-[9px] mt-0.5">
                    {format(new Date(unlockedAt), "d MMM yy", { locale: uk })}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Detail sheet */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title="">
        {selected && (() => {
          const isUnlocked = !!unlockedKeys[selected.key];
          return (
            <div className="pb-8 space-y-4">
              <div className="text-center">
                <div className={cn("text-6xl mb-3", !isUnlocked && "grayscale")}>{isUnlocked ? selected.icon : "🔒"}</div>
                <h2 className="text-white font-black text-xl">{selected.name}</h2>
                <p className="text-[#6b7280] text-sm mt-1">{selected.description}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] text-xs font-semibold text-white">
                  {RARITY_LABEL_FULL[selected.rarity]}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#00FF85]/10 text-[#00FF85] text-xs font-semibold">
                  +{selected.xp_reward} XP
                </span>
              </div>
              {isUnlocked ? (
                <div className="bg-[#00FF85]/5 border border-[#00FF85]/20 rounded-2xl p-4 text-center">
                  <p className="text-[#00FF85] text-sm font-semibold">✓ Розблоковано</p>
                  <p className="text-[#6b7280] text-xs mt-1">
                    {format(new Date(unlockedKeys[selected.key]), "d MMMM yyyy", { locale: uk })}
                  </p>
                </div>
              ) : (
                <div className="bg-[#111111] border border-white/5 rounded-2xl p-4">
                  <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1.5">Як розблокувати</p>
                  <p className="text-white text-sm">{HOW_TO_UNLOCK[selected.key] ?? selected.description}</p>
                </div>
              )}
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
}
