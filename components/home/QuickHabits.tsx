"use client";

import { useState } from "react";
import type { Habit, DailyLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

interface HabitWithLog extends Habit {
  log?: DailyLog;
}

interface QuickHabitsProps {
  habits: HabitWithLog[];
  onToggle: (habit: Habit) => void;
}

export function QuickHabits({ habits, onToggle }: QuickHabitsProps) {
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const checkboxHabits = habits.filter((h) => h.type === "checkbox" && h.is_active);

  if (!checkboxHabits.length) return null;

  async function saveNote(habit: HabitWithLog) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        habit_id: habit.id,
        date: today,
        completed: habit.log?.completed ?? false,
        note: noteValues[habit.id] ?? habit.log?.note ?? null,
      },
      { onConflict: "user_id,habit_id,date" }
    );
  }

  return (
    <div>
      <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-2">
        Швидкі звички
      </p>
      <div className="space-y-2">
        {checkboxHabits.map((habit) => {
          const done = habit.log?.completed ?? false;
          const noteExpanded = expandedNotes[habit.id] ?? false;
          const hasNote = !!(noteValues[habit.id] ?? habit.log?.note);

          return (
            <div key={habit.id}>
              <div
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  done
                    ? "bg-[#00FF85]/5 border-[#00FF85]/20"
                    : "bg-[#111111] border-white/5"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => onToggle(habit)}
                    className={cn(
                      "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                      done ? "bg-[#00FF85] border-[#00FF85]" : "border-white/30"
                    )}
                  >
                    {done && <span className="text-black text-xs font-black">✓</span>}
                  </button>
                  <span
                    className={cn(
                      "text-sm font-medium flex-1 min-w-0 truncate",
                      done ? "line-through text-white/40" : "text-white"
                    )}
                  >
                    {habit.name}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setExpandedNotes((p) => ({ ...p, [habit.id]: !noteExpanded }))
                  }
                  className={cn(
                    "ml-2 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    noteExpanded || hasNote
                      ? "bg-[#00FF85]/20 text-[#00FF85]"
                      : "text-[#6b7280]"
                  )}
                >
                  <MessageCircle size={14} />
                </button>
              </div>

              {noteExpanded && (
                <div className="px-2 pt-1 animate-fade-in">
                  <textarea
                    value={noteValues[habit.id] ?? habit.log?.note ?? ""}
                    onChange={(e) =>
                      setNoteValues((p) => ({ ...p, [habit.id]: e.target.value }))
                    }
                    onBlur={() => saveNote(habit)}
                    placeholder="Що конкретно зробив? (необов'язково)"
                    rows={2}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none resize-none focus:border-[#00FF85]/50 transition-colors"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
