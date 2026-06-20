"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Settings, Zap, Snowflake, Trophy } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { uk } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Skill, Habit, DailyLog, Profile } from "@/lib/types";
import { SkillCard } from "@/components/home/SkillCard";
import { QuickHabits } from "@/components/home/QuickHabits";
import { T6XLogoText } from "@/components/T6XLogo";
import { useDeepWorkTimer } from "@/lib/hooks/useDeepWorkTimer";
import { useStreak } from "@/lib/hooks/useStreak";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { DeepWorkTimerSheet } from "@/components/home/DeepWorkTimerSheet";
import { showToast } from "@/components/ui/Toaster";
import { getQuoteOfDay } from "@/lib/quotes";
import { getLevelInfo } from "@/lib/xp";

type SkillStatus = "pending" | "done" | "failed";

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [skillStatuses, setSkillStatuses] = useState<Record<string, SkillStatus>>({});
  const [timerOpen, setTimerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [levelUp, setLevelUp] = useState<{ level: number; name: string } | null>(null);

  const supabase = createClient();
  const { todayMinutes, formatMinutes } = useDeepWorkTimer();
  const { streak, freeze } = useStreak();

  const today = format(new Date(), "yyyy-MM-dd");
  const todayStr = format(new Date(), "EEEE, d MMMM", { locale: uk });
  const quote = getQuoteOfDay();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: prof }, { data: sk }, { data: hab }, { data: lg }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("skills").select("*").eq("user_id", user.id).eq("is_active", true).order("sort_order"),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("daily_logs").select("*").eq("user_id", user.id).eq("date", today),
    ]);

    setProfile(prof);
    setSkills(sk ?? []);
    setAllHabits(hab ?? []);
    setLogs(lg ?? []);

    // Compute skill statuses from logs
    const statuses: Record<string, SkillStatus> = {};
    for (const skill of sk ?? []) {
      const skillHabits = (hab ?? []).filter((h) => h.skill_id === skill.id);
      const completed = (lg ?? []).filter((l) =>
        skillHabits.some((h) => h.id === l.habit_id) && l.completed
      ).length;
      if (completed > 0) statuses[skill.id] = "done";
      else statuses[skill.id] = "pending";
    }
    setSkillStatuses(statuses);
    setLoading(false);
  }

  async function toggleSkillStatus(skill: Skill) {
    if (navigator.vibrate) navigator.vibrate(10);
    const current = skillStatuses[skill.id] ?? "pending";
    const next: SkillStatus =
      current === "pending" ? "done" : current === "done" ? "failed" : "pending";

    setSkillStatuses((s) => ({ ...s, [skill.id]: next }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const skillHabits = allHabits.filter((h) => h.skill_id === skill.id);
    for (const habit of skillHabits) {
      await supabase.from("daily_logs").upsert(
        {
          user_id: user.id,
          habit_id: habit.id,
          date: today,
          completed: next === "done",
        },
        { onConflict: "user_id,habit_id,date" }
      );
    }
    await loadData();
  }

  async function toggleHabit(habit: Habit) {
    if (navigator.vibrate) navigator.vibrate(10);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = logs.find((l) => l.habit_id === habit.id);
    const completed = !(existing?.completed ?? false);

    setLogs((prev) => {
      const without = prev.filter((l) => l.habit_id !== habit.id);
      return [...without, { ...(existing ?? { id: "", user_id: user.id, habit_id: habit.id, date: today, note: null, value: null, created_at: "" }), completed }];
    });

    await supabase.from("daily_logs").upsert(
      { user_id: user.id, habit_id: habit.id, date: today, completed },
      { onConflict: "user_id,habit_id,date" }
    );
    if (completed) showToast(`${habit.name} ✓`);
  }

  const dayNumber = profile?.goal_start_date
    ? differenceInDays(new Date(), new Date(profile.goal_start_date)) + 1
    : 0;

  const habitsWithLogs = allHabits.map((h) => ({
    ...h,
    log: logs.find((l) => l.habit_id === h.id),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#00FF85] animate-pulse text-2xl font-black">T6X</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <T6XLogoText />
        <div className="flex-1 text-center">
          <p className="text-white/60 text-xs capitalize">{todayStr}</p>
          <p className="text-white text-xs font-semibold">
            S1 · День {dayNumber} з 180
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#111111] rounded-full px-2.5 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-[#f59e0b] font-bold text-sm">{streak}</span>
          </div>
          <Link href="/achievements" className="text-[#6b7280] p-1.5">
            <Trophy size={20} />
          </Link>
          <Link href="/notes" className="text-[#6b7280] p-1.5">
            <FileText size={20} />
          </Link>
          <Link href="/settings" className="text-[#6b7280] p-1.5">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* XP bar */}
      {profile && (() => {
        const xpInfo = getLevelInfo(profile.total_xp ?? 0);
        return (
          <div className="px-4 mb-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-[#6b7280]">
                Рівень {xpInfo.level} · {xpInfo.name}
              </span>
              <span className="text-[11px] text-[#6b7280]">
                {xpInfo.xpInLevel} / {xpInfo.xpForNext} XP
              </span>
            </div>
            <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00FF85] rounded-full transition-all duration-500"
                style={{ width: `${xpInfo.progress}%` }}
              />
            </div>
          </div>
        );
      })()}

      <div className="px-4 space-y-5 pb-4">
        {/* Quote */}
        <div className="bg-[#111111] rounded-2xl px-4 py-3 animate-fade-in">
          <p className="text-white/60 text-sm italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
        </div>

        {/* Big Skills 2x2 */}
        {skills.length > 0 && (
          <div>
            <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-2">
              Великі скіли
            </p>
            <div className="grid grid-cols-2 gap-3">
              {skills.slice(0, 4).map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  status={skillStatuses[skill.id] ?? "pending"}
                  onToggle={() => toggleSkillStatus(skill)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Deep Work */}
        <button
          onClick={() => setTimerOpen(true)}
          className="w-full bg-[#111111] rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00FF85]/10 flex items-center justify-center">
              <Zap size={18} className="text-[#00FF85]" />
            </div>
            <div className="text-left">
              <p className="text-[#6b7280] text-xs">Deep Work сьогодні</p>
              <p className="text-white font-bold text-lg">
                ⚡ {todayMinutes > 0 ? formatMinutes(todayMinutes) : "0 хв"}
              </p>
            </div>
          </div>
          <span className="text-[#6b7280] text-sm">→</span>
        </button>

        {/* Quick Habits */}
        <QuickHabits habits={habitsWithLogs} onToggle={toggleHabit} />

        {/* Streak Freeze */}
        {streak > 0 && !profile?.streak_freeze_used_this_month && (
          <button
            onClick={freeze}
            className="w-full bg-[#111111]/50 border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-[#6b7280] text-sm active:scale-95 transition-all"
          >
            <Snowflake size={16} />
            Заморозити стрік (1× на місяць)
          </button>
        )}
      </div>

      <BottomSheet open={timerOpen} onClose={() => setTimerOpen(false)} title="Deep Work">
        <DeepWorkTimerSheet onClose={() => setTimerOpen(false)} />
      </BottomSheet>

      {/* Level-up overlay */}
      {levelUp && (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/90"
          onClick={() => setLevelUp(null)}
        >
          <div className="text-center animate-fade-in">
            <div className="text-7xl mb-4">⚡</div>
            <p className="text-[#00FF85] text-sm font-semibold uppercase tracking-widest mb-2">Новий рівень</p>
            <p className="text-white font-black text-6xl mb-3">{levelUp.level}</p>
            <p className="text-white/70 text-xl font-semibold">{levelUp.name}</p>
            <p className="text-[#6b7280] text-sm mt-6">Торкніться, щоб закрити</p>
          </div>
        </div>
      )}
    </div>
  );
}
