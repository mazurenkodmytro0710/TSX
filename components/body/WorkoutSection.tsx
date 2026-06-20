"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutTemplate, WorkoutSession, WorkoutSet, Exercise, TemplateExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toaster";

interface SetRow {
  setNumber: number;
  weight: string;
  reps: string;
  saved: boolean;
}

export function WorkoutSection() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [todayTemplate, setTodayTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateExercises, setTemplateExercises] = useState<Array<TemplateExercise & { exercise: Exercise }>>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<Record<string, SetRow[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: tmpls }, { data: sess }] = await Promise.all([
      supabase.from("workout_templates").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("workout_sessions").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
    ]);

    setTemplates(tmpls ?? []);

    // Determine today's template by rotating A→B→C
    if (tmpls?.length) {
      const { data: pastSessions } = await supabase
        .from("workout_sessions")
        .select("template_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const lastTemplateId = pastSessions?.[0]?.template_id;
      const lastIdx = lastTemplateId
        ? tmpls.findIndex((t) => t.id === lastTemplateId)
        : -1;
      const nextIdx = (lastIdx + 1) % tmpls.length;
      setTodayTemplate(tmpls[nextIdx]);
    }

    if (sess) {
      setSession(sess);
      await loadSessionSets(sess.id);
    }

    setLoading(false);
  }

  async function loadSessionSets(sessionId: string) {
    const { data } = await supabase
      .from("workout_sets")
      .select("*, exercise:exercises(*)")
      .eq("session_id", sessionId)
      .order("set_number");

    const grouped: Record<string, SetRow[]> = {};
    for (const s of data ?? []) {
      if (!grouped[s.exercise_id]) grouped[s.exercise_id] = [];
      grouped[s.exercise_id].push({
        setNumber: s.set_number,
        weight: s.weight_kg?.toString() ?? "",
        reps: s.reps?.toString() ?? "",
        saved: true,
      });
    }
    setSets(grouped);
  }

  async function startWorkout() {
    if (navigator.vibrate) navigator.vibrate(10);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !todayTemplate) return;

    const { data: sess } = await supabase.from("workout_sessions").insert({
      user_id: user.id,
      template_id: todayTemplate.id,
      date: today,
      started_at: new Date().toISOString(),
    }).select().single();

    setSession(sess);

    const { data: texs } = await supabase
      .from("template_exercises")
      .select("*, exercise:exercises(*)")
      .eq("template_id", todayTemplate.id)
      .order("sort_order");

    setTemplateExercises(texs ?? []);

    const initSets: Record<string, SetRow[]> = {};
    for (const te of texs ?? []) {
      const startW = te.starting_weight_kg > 0 ? te.starting_weight_kg.toString() : "";
      initSets[te.exercise_id] = [{ setNumber: 1, weight: startW, reps: "", saved: false }];
    }
    setSets(initSets);
  }

  async function logSet(exerciseId: string, idx: number) {
    if (navigator.vibrate) navigator.vibrate(10);
    if (!session) return;
    const row = sets[exerciseId]?.[idx];
    if (!row) return;

    await supabase.from("workout_sets").insert({
      session_id: session.id,
      exercise_id: exerciseId,
      set_number: row.setNumber,
      weight_kg: parseFloat(row.weight) || null,
      reps: parseInt(row.reps) || null,
    });

    setSets((prev) => {
      const rows = [...(prev[exerciseId] ?? [])];
      rows[idx] = { ...rows[idx], saved: true };
      return { ...prev, [exerciseId]: rows };
    });
  }

  function addSet(exerciseId: string) {
    setSets((prev) => {
      const rows = prev[exerciseId] ?? [];
      return {
        ...prev,
        [exerciseId]: [...rows, { setNumber: rows.length + 1, weight: rows[rows.length - 1]?.weight ?? "", reps: rows[rows.length - 1]?.reps ?? "", saved: false }],
      };
    });
  }

  function updateSet(exerciseId: string, idx: number, field: "weight" | "reps", value: string) {
    setSets((prev) => {
      const rows = [...(prev[exerciseId] ?? [])];
      rows[idx] = { ...rows[idx], [field]: value, saved: false };
      return { ...prev, [exerciseId]: rows };
    });
  }

  async function finishWorkout() {
    if (!session) return;
    await supabase.from("workout_sessions").update({
      ended_at: new Date().toISOString(),
    }).eq("id", session.id);
    if (navigator.vibrate) navigator.vibrate([10, 50, 20, 50, 10]);
    showToast("Тренування завершено 💪");
  }

  if (loading) return <div className="py-8 text-center text-[#6b7280]">Завантаження...</div>;

  if (!session) {
    return (
      <div className="space-y-4 pb-6">
        <div className="bg-[#111111] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[#6b7280] text-xs">Сьогодні</p>
            <p className="text-white font-bold text-lg">{todayTemplate?.name ?? "—"}</p>
          </div>
          <span className="bg-[#00FF85]/20 text-[#00FF85] text-xs font-semibold px-3 py-1 rounded-full">
            Авто
          </span>
        </div>

        <Button
          onClick={startWorkout}
          className="w-full h-14 bg-[#00FF85] text-black font-bold text-base rounded-2xl gap-2"
        >
          💪 Почати тренування
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      <div className="bg-[#111111] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[#6b7280] text-xs">Активне тренування</p>
          <p className="text-white font-bold">{todayTemplate?.name}</p>
        </div>
        <span className="text-[#00FF85] text-xs">🟢 LIVE</span>
      </div>

      {templateExercises.map((te) => {
        const ex = te.exercise;
        const exSets = sets[te.exercise_id] ?? [];
        const isExpanded = expanded[te.exercise_id] ?? true;
        const savedCount = exSets.filter((s) => s.saved).length;

        return (
          <div key={te.id} className="bg-[#111111] rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded((p) => ({ ...p, [te.exercise_id]: !isExpanded }))}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="text-left">
                <p className="text-white font-semibold">{ex.name}</p>
                <p className="text-[#6b7280] text-xs">{ex.muscle_group} · {savedCount}/{exSets.length} підходів</p>
              </div>
              {isExpanded ? <ChevronUp size={18} className="text-[#6b7280]" /> : <ChevronDown size={18} className="text-[#6b7280]" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {exSets.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[#6b7280] text-xs w-5">{row.setNumber}</span>
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(e) => updateSet(te.exercise_id, idx, "weight", e.target.value)}
                        placeholder="кг"
                        className="w-16 bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none"
                      />
                      <span className="text-[#6b7280] text-xs">×</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={row.reps}
                        onChange={(e) => updateSet(te.exercise_id, idx, "reps", e.target.value)}
                        placeholder="повт"
                        className="w-16 bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none"
                      />
                    </div>
                    <button
                      onClick={() => logSet(te.exercise_id, idx)}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                        row.saved ? "bg-[#00FF85] text-black" : "bg-[#1a1a1a] text-[#6b7280]"
                      )}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addSet(te.exercise_id)}
                  className="flex items-center gap-2 text-[#6b7280] text-sm py-1"
                >
                  <Plus size={14} /> Додати підхід
                </button>
              </div>
            )}
          </div>
        );
      })}

      <Button
        onClick={finishWorkout}
        className="w-full h-14 bg-[#111111] border border-[#00FF85]/30 text-[#00FF85] font-bold text-base rounded-2xl"
      >
        Завершити тренування ✓
      </Button>
    </div>
  );
}
