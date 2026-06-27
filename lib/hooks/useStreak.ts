"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("streak")
      .eq("id", user.id)
      .single();

    setStreak(profile?.streak ?? 0);
    setLoading(false);
  }, [supabase]);

  const recalculate = useCallback(async (): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: skills } = await supabase
      .from("skills")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (!skills?.length) return 0;

    const { data: habits } = await supabase
      .from("habits")
      .select("id, skill_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("skill_id", skills.map((s) => s.id));

    let currentStreak = 0;
    let date = new Date();

    for (let i = 0; i < 180; i++) {
      const dateStr = format(date, "yyyy-MM-dd");
      const { data: logs } = await supabase
        .from("daily_logs")
        .select("habit_id, completed")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .eq("completed", true);

      const completedSkillIds = new Set(
        (logs ?? []).map((l) => {
          const h = habits?.find((h) => h.id === l.habit_id);
          return h?.skill_id;
        }).filter(Boolean)
      );

      const pct = skills.length > 0
        ? completedSkillIds.size / skills.length
        : 0;

      if (pct >= 0.5) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }

      date = subDays(date, 1);
    }

    await supabase
      .from("profiles")
      .update({ streak: currentStreak })
      .eq("id", user.id);

    setStreak(currentStreak);
    return currentStreak;
  }, [supabase]);

  const freeze = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), "yyyy-MM-dd");
    await supabase.from("profiles").update({
      streak_freeze_used_this_month: true,
    }).eq("id", user.id);

    // Insert synthetic log for all active habits today
    const { data: habits } = await supabase
      .from("habits")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (habits?.length) {
      const rows = habits.map((h) => ({
        user_id: user.id,
        habit_id: h.id,
        date: today,
        completed: true,
        note: "🧊 Стрік-фріз",
      }));
      await supabase.from("daily_logs").upsert(rows, {
        onConflict: "user_id,habit_id,date",
      });
    }

    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
  }, [supabase]);

  return { streak, loading, recalculate, freeze };
}
