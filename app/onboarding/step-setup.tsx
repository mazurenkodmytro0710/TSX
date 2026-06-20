"use client";

import { useState } from "react";
import type { OnboardingData } from "./page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { addMonths, format } from "date-fns";

interface Props {
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
  onComplete: () => void;
}

export function StepSetup({ data, onChange, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleFinish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const startDate = format(now, "yyyy-MM-dd");
    const endDate = format(addMonths(now, 6), "yyyy-MM-dd");

    await supabase.from("profiles").upsert({
      id: user.id,
      name: data.name,
      goal_start_date: startDate,
      goal_end_date: endDate,
      point_a: data.pointA,
      point_b: data.pointB,
      month_one_plan: data.monthOnePlan,
      calorie_goal: data.calorieGoal,
      protein_goal: data.proteinGoal,
      sleep_target_time: data.sleepTime,
      daily_reminder_time: data.reminderTime,
      streak: 0,
    });

    // Create Season 1
    const { data: season } = await supabase.from("seasons").insert({
      user_id: user.id,
      number: 1,
      name: "Сезон 1",
      start_date: startDate,
      end_date: endDate,
      point_a: data.pointA,
      point_b: data.pointB,
      month_one_plan: data.monthOnePlan,
      status: "active",
    }).select().single();

    // Seed default skills
    const defaultSkills = [
      { name: "Тіло", icon: "💪", category: "body", color: "#ef4444" },
      { name: "Програмування", icon: "🧠", category: "focus", color: "#00FF85" },
      { name: "Комунікація", icon: "🗣️", category: "social", color: "#f59e0b" },
      { name: "Англійська", icon: "📚", category: "focus", color: "#3b82f6" },
    ];

    for (let i = 0; i < defaultSkills.length; i++) {
      await supabase.from("skills").insert({
        user_id: user.id,
        ...defaultSkills[i],
        sort_order: i,
        season_id: season?.id,
      });
    }

    // Seed workout templates and exercises
    await seedWorkoutData(user.id, season?.id);

    // Seed finance account
    await supabase.from("finance_accounts").insert({
      user_id: user.id,
      name: "Основний рахунок",
      currency: "EUR",
      icon: "💶",
      current_balance: 0,
      include_in_total: true,
      sort_order: 0,
    });

    // Seed default expense categories
    const defaultCategories = [
      { name: "Їжа", icon: "🍕", color: "#f59e0b" },
      { name: "Транспорт", icon: "🚌", color: "#3b82f6" },
      { name: "Житло", icon: "🏠", color: "#8b5cf6" },
      { name: "Здоров'я", icon: "💊", color: "#ef4444" },
      { name: "Розваги", icon: "🎯", color: "#00FF85" },
      { name: "Покупки", icon: "🛒", color: "#f97316" },
      { name: "Інше", icon: "💡", color: "#6b7280" },
    ];
    for (const cat of defaultCategories) {
      await supabase.from("expense_categories").insert({
        user_id: user.id,
        ...cat,
        parent_id: null,
      });
    }

    setLoading(false);
    onComplete();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col px-6 pt-12 pb-8">
      <div className="mb-8">
        <p className="text-[#00FF85] text-sm font-semibold mb-2 uppercase tracking-wider">
          Крок 4 — Налаштування
        </p>
        <h1 className="text-3xl font-black text-white mb-3 leading-tight">
          Твої параметри
        </h1>
        <p className="text-[#6b7280] text-sm">
          Встановимо базові норми і нагадування.
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto">
        <div>
          <Label className="text-[#6b7280] text-sm">Ім&apos;я</Label>
          <Input
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Як тебе звуть?"
            className="mt-1.5 bg-[#111111] border-white/10 text-white placeholder:text-white/20 h-12"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[#6b7280] text-sm">Калорії/день</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={data.calorieGoal}
              onChange={(e) => onChange({ calorieGoal: Number(e.target.value) })}
              className="mt-1.5 bg-[#111111] border-white/10 text-white h-12"
            />
          </div>
          <div>
            <Label className="text-[#6b7280] text-sm">Білок/день (г)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={data.proteinGoal}
              onChange={(e) => onChange({ proteinGoal: Number(e.target.value) })}
              className="mt-1.5 bg-[#111111] border-white/10 text-white h-12"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[#6b7280] text-sm">Час сну</Label>
            <Input
              type="time"
              value={data.sleepTime}
              onChange={(e) => onChange({ sleepTime: e.target.value })}
              className="mt-1.5 bg-[#111111] border-white/10 text-white h-12"
            />
          </div>
          <div>
            <Label className="text-[#6b7280] text-sm">Нагадування</Label>
            <Input
              type="time"
              value={data.reminderTime}
              onChange={(e) => onChange({ reminderTime: e.target.value })}
              className="mt-1.5 bg-[#111111] border-white/10 text-white h-12"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleFinish}
        disabled={loading || !data.name.trim()}
        className="mt-6 w-full h-14 bg-[#00FF85] text-black font-bold text-base rounded-2xl hover:bg-[#00e876] active:scale-95 transition-all disabled:opacity-40"
      >
        {loading ? "Збереження..." : "🚀 Розпочати 6 місяців"}
      </Button>
    </div>
  );
}

async function seedWorkoutData(userId: string, seasonId?: string) {
  const supabase = createClient();

  const exercises = [
    { name: "Bench Press (flat)", muscle_group: "Груди" },
    { name: "Bench Press (incline)", muscle_group: "Верхні груди" },
    { name: "Squat", muscle_group: "Ноги" },
    { name: "Deadlift", muscle_group: "Спина" },
    { name: "Overhead Press", muscle_group: "Плечі" },
    { name: "Pull-ups", muscle_group: "Спина" },
    { name: "Dips", muscle_group: "Груди/Трицепс" },
    { name: "Barbell Row", muscle_group: "Спина" },
    { name: "Leg Press", muscle_group: "Ноги" },
    { name: "Romanian Deadlift", muscle_group: "Ноги/Спина" },
  ];

  const { data: exs } = await supabase.from("exercises").insert(
    exercises.map((e) => ({ user_id: userId, ...e, is_custom: false }))
  ).select();

  if (!exs) return;

  const templateNames = ["Full Body A", "Full Body B", "Full Body C"];
  const templateExercises: Record<string, string[]> = {
    "Full Body A": ["Bench Press (flat)", "Squat", "Barbell Row", "Overhead Press", "Pull-ups"],
    "Full Body B": ["Bench Press (incline)", "Deadlift", "Dips", "Leg Press", "Barbell Row"],
    "Full Body C": ["Squat", "Romanian Deadlift", "Bench Press (flat)", "Pull-ups", "Overhead Press"],
  };

  for (let i = 0; i < templateNames.length; i++) {
    const name = templateNames[i];
    const { data: tmpl } = await supabase.from("workout_templates").insert({
      user_id: userId,
      name,
      sort_order: i,
      season_id: seasonId,
    }).select().single();

    if (!tmpl) continue;

    const exNames = templateExercises[name];
    for (let j = 0; j < exNames.length; j++) {
      const ex = exs.find((e: { name: string; id: string }) => e.name === exNames[j]);
      if (ex) {
        await supabase.from("template_exercises").insert({
          template_id: tmpl.id,
          exercise_id: ex.id,
          sort_order: j,
        });
      }
    }
  }
}
