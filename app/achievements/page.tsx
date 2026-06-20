"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

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

export default function AchievementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [unlockedKeys, setUnlockedKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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
              <div
                key={a.key}
                className={cn(
                  "bg-[#111111] rounded-2xl p-3 flex flex-col items-center text-center border",
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
