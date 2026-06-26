"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Skill, Habit, DailyLog } from "@/lib/types";
import { useDeepWorkTimer } from "@/lib/hooks/useDeepWorkTimer";
import { awardXP, checkAllHabitsDoneToday } from "@/lib/achievements";
import { XP_REWARDS } from "@/lib/xp";
import { PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function FocusPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [numValues, setNumValues] = useState<Record<string, string>>({});
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", icon: "⭐", habits: [""] });
  const [deepWorkHours, setDeepWorkHours] = useState("");
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const { todayMinutes, addManual, formatMinutes } = useDeepWorkTimer();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: sk }, { data: hab }, { data: lg }] = await Promise.all([
      supabase.from("skills").select("*").eq("user_id", user.id).eq("is_active", true).order("sort_order"),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("daily_logs").select("*").eq("user_id", user.id).eq("date", today),
    ]);

    setSkills(sk ?? []);
    setHabits(hab ?? []);
    setLogs(lg ?? []);

    const initExpanded: Record<string, boolean> = {};
    for (const s of sk ?? []) initExpanded[s.id] = true;
    setExpanded(initExpanded);
  }

  async function toggleHabit(habit: Habit, type: string) {
    if (navigator.vibrate) navigator.vibrate(10);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = logs.find((l) => l.habit_id === habit.id);
    const completed = !(existing?.completed ?? false);

    await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        habit_id: habit.id,
        date: today,
        completed,
        note: noteValues[habit.id] || null,
        value: numValues[habit.id] ? parseFloat(numValues[habit.id]) : null,
      },
      { onConflict: "user_id,habit_id,date" }
    );

    setLogs((prev) => {
      const without = prev.filter((l) => l.habit_id !== habit.id);
      return [...without, { id: "", user_id: user.id, habit_id: habit.id, date: today, completed, note: null, value: null, created_at: "" }];
    });

    if (completed) {
      await awardXP(user.id, XP_REWARDS.HABIT_COMPLETED, "Звичка виконана");
      const allDone = await checkAllHabitsDoneToday(user.id);
      if (allDone) await awardXP(user.id, XP_REWARDS.ALL_HABITS_DAY, "Всі звички за день");
    }
  }

  async function saveHabitNote(habit: Habit) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = logs.find((l) => l.habit_id === habit.id);

    await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        habit_id: habit.id,
        date: today,
        completed: existing?.completed ?? false,
        note: noteValues[habit.id] || null,
        value: numValues[habit.id] ? parseFloat(numValues[habit.id]) : null,
      },
      { onConflict: "user_id,habit_id,date" }
    );
  }

  async function addNewSkill() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newSkill.name.trim()) return;

    const { data: skill } = await supabase.from("skills").insert({
      user_id: user.id,
      name: newSkill.name,
      icon: newSkill.icon,
      category: "custom",
      color: "#00FF85",
      sort_order: skills.length,
    }).select().single();

    if (skill) {
      for (let i = 0; i < newSkill.habits.length; i++) {
        if (newSkill.habits[i].trim()) {
          await supabase.from("habits").insert({
            user_id: user.id,
            skill_id: skill.id,
            name: newSkill.habits[i].trim(),
            type: "checkbox",
            sort_order: i,
          });
        }
      }
    }

    setAddSkillOpen(false);
    setNewSkill({ name: "", icon: "⭐", habits: [""] });
    await load();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe px-4">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-black text-white">🧠 Фокус</h1>
      </header>

      {/* Manual Deep Work logging */}
      <div className="bg-[#111111] rounded-2xl p-4 mb-4">
        <p className="text-white font-semibold mb-1">⚡ Deep Work</p>
        <p className="text-[#6b7280] text-xs mb-4">Скільки годин глибокої роботи сьогодні?</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#1a1a1a] rounded-xl h-[52px] flex items-center px-4">
            <input
              type="number"
              inputMode="decimal"
              value={deepWorkHours}
              onChange={(e) => setDeepWorkHours(e.target.value)}
              placeholder="0"
              className="bg-transparent text-white text-2xl font-bold w-full outline-none"
            />
            <span className="text-[#6b7280] text-sm shrink-0">год</span>
          </div>
          <Button
            onClick={async () => {
              const h = parseFloat(deepWorkHours);
              if (!h || h <= 0) return;
              await addManual(h);
              setDeepWorkHours("");
            }}
            className="h-[52px] px-6 bg-[#00FF85] text-black font-semibold rounded-xl"
          >
            Зберегти
          </Button>
        </div>
        {todayMinutes > 0 && (
          <p className="text-[#00FF85] text-sm mt-3">
            Сьогодні: {formatMinutes(todayMinutes)}
          </p>
        )}
      </div>

      {/* Skills accordion */}
      <div className="space-y-3 pb-4">
        {skills.map((skill) => {
          const skillHabits = habits.filter((h) => h.skill_id === skill.id);
          const completedCount = skillHabits.filter((h) =>
            logs.some((l) => l.habit_id === h.id && l.completed)
          ).length;
          const pct = skillHabits.length > 0
            ? Math.round((completedCount / skillHabits.length) * 100)
            : 0;
          const isOpen = expanded[skill.id];

          return (
            <div key={skill.id} className="bg-[#111111] rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded((p) => ({ ...p, [skill.id]: !isOpen }))}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{skill.icon}</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">{skill.name}</p>
                    <p className="text-[#6b7280] text-xs">
                      {completedCount}/{skillHabits.length} · {pct}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00FF85] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-[#6b7280]" /> : <ChevronDown size={16} className="text-[#6b7280]" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  {skillHabits.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-gray-600 text-sm">Немає звичок</p>
                      <p className="text-gray-700 text-xs mt-1">Додай свої звички в Налаштуваннях</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {skillHabits.map((habit) => {
                        const log = logs.find((l) => l.habit_id === habit.id);
                        const done = log?.completed ?? false;
                        return (
                          <div key={habit.id} className="space-y-2">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleHabit(habit, habit.type)}
                                className={cn(
                                  "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                                  done ? "bg-[#00FF85] border-[#00FF85] text-black" : "border-white/20"
                                )}
                              >
                                {done && <span className="text-xs font-black">✓</span>}
                              </button>
                              <span className={cn("text-sm flex-1", done ? "text-white line-through opacity-60" : "text-white")}>
                                {habit.name}
                              </span>
                            </div>
                            {done && (habit.type === "note" || habit.type === "counter" || habit.type === "duration") && (
                              <div className="ml-9 animate-fade-in">
                                {habit.type === "note" ? (
                                  <Textarea
                                    value={noteValues[habit.id] ?? log?.note ?? ""}
                                    onChange={(e) => setNoteValues((p) => ({ ...p, [habit.id]: e.target.value }))}
                                    onBlur={() => saveHabitNote(habit)}
                                    placeholder="Що конкретно зробив?"
                                    rows={2}
                                    className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/20 resize-none text-xs"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      value={numValues[habit.id] ?? log?.value?.toString() ?? ""}
                                      onChange={(e) => setNumValues((p) => ({ ...p, [habit.id]: e.target.value }))}
                                      onBlur={() => saveHabitNote(habit)}
                                      placeholder={habit.type === "counter" ? "Кількість" : "Хвилин"}
                                      className="w-24 bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                                    />
                                    <span className="text-[#6b7280] text-xs">
                                      {habit.type === "counter" ? "разів" : "хв"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setAddSkillOpen(true)}
          className="w-full bg-[#111111]/50 border border-dashed border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 text-[#6b7280] text-sm"
        >
          <PlusCircle size={16} /> Додати скіл
        </button>
      </div>

      <BottomSheet open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="Новий скіл">
        <div className="space-y-4 pb-6">
          <div className="flex gap-3">
            <div className="w-20">
              <Label className="text-[#6b7280] text-xs">Іконка</Label>
              <Input
                value={newSkill.icon}
                onChange={(e) => setNewSkill((s) => ({ ...s, icon: e.target.value }))}
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white text-2xl text-center h-12"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[#6b7280] text-xs">Назва</Label>
              <Input
                value={newSkill.name}
                onChange={(e) => setNewSkill((s) => ({ ...s, name: e.target.value }))}
                placeholder="Назва скіла"
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-12"
              />
            </div>
          </div>

          <div>
            <Label className="text-[#6b7280] text-xs mb-2 block">Звички (1-3)</Label>
            {newSkill.habits.map((h, i) => (
              <Input
                key={i}
                value={h}
                onChange={(e) => {
                  const updated = [...newSkill.habits];
                  updated[i] = e.target.value;
                  setNewSkill((s) => ({ ...s, habits: updated }));
                }}
                placeholder={`Звичка ${i + 1}`}
                className="mb-2 bg-[#1a1a1a] border-white/10 text-white h-11"
              />
            ))}
            {newSkill.habits.length < 3 && (
              <button
                onClick={() => setNewSkill((s) => ({ ...s, habits: [...s.habits, ""] }))}
                className="text-[#6b7280] text-xs flex items-center gap-1"
              >
                <PlusCircle size={12} /> Додати звичку
              </button>
            )}
          </div>

          <Button
            onClick={addNewSkill}
            disabled={!newSkill.name.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl"
          >
            Створити скіл
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
