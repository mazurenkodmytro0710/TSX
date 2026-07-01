"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutTemplate, WorkoutSession, Exercise, TemplateExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import { showToast } from "@/components/ui/Toaster";
import { awardXP, checkWorkoutAchievements } from "@/lib/achievements";
import { XP_REWARDS } from "@/lib/xp";

interface SetRow { setNumber: number; weight: string; reps: string; }
interface ExerciseWithTemplate extends TemplateExercise { exercise: Exercise; }

type WorkoutMode = "template" | "freetext";

type ParsedSet = {
  muscleGroup: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  rawLine: string;
};

function parseWorkoutText(text: string): ParsedSet[] {
  const lines = text.trim().split("\n").filter(Boolean);
  const results: ParsedSet[] = [];
  let currentMuscleGroup = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(":");
    let musclePart = "";
    let restPart = trimmed;

    if (colonIdx > -1) {
      musclePart = trimmed.slice(0, colonIdx).trim().toLowerCase();
      restPart = trimmed.slice(colonIdx + 1).trim();
    }

    // Match "weight × reps × sets" with "на", "x", "×" separators
    const numPattern = /([\d,\.]+)\s*(?:на|x|×)\s*(\d+)\s*(?:на|x|×)\s*(\d+)/i;
    const match = restPart.match(numPattern);

    if (match) {
      const firstNumIdx = restPart.search(/([\d,\.]+)\s*(?:на|x|×)/i);
      const exercisePart = firstNumIdx > 0 ? restPart.slice(0, firstNumIdx).trim() : "";
      const exerciseName = exercisePart || musclePart || "Вправа";
      const weight = parseFloat(match[1].replace(",", "."));
      const reps = parseInt(match[2]);
      const sets = parseInt(match[3]);
      const muscle = musclePart || currentMuscleGroup;
      currentMuscleGroup = muscle;
      results.push({ muscleGroup: muscle, exerciseName, weight, reps, sets, rawLine: trimmed });
    } else if (musclePart && !restPart.match(/\d/)) {
      currentMuscleGroup = musclePart;
    }
  }
  return results;
}

export function WorkoutSection() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateExercises, setTemplateExercises] = useState<ExerciseWithTemplate[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<Record<string, SetRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [lastWorkout, setLastWorkout] = useState<{ template_name: string; date: string } | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>("template");
  const [freetextOpen, setFreetextOpen] = useState(false);
  const [freetextWorkout, setFreetextWorkout] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedSet[]>([]);
  const [savingFreetext, setSavingFreetext] = useState(false);
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: tmpls }, { data: sess }, { data: exs }] = await Promise.all([
      supabase.from("workout_templates").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("workout_sessions").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
      supabase.from("exercises").select("*").eq("user_id", user.id),
    ]);

    setTemplates(tmpls ?? []);
    setExercises(exs ?? []);

    const { data: prevSess } = await supabase
      .from("workout_sessions")
      .select("*, template:workout_templates(name)")
      .eq("user_id", user.id)
      .neq("date", today)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevSess) {
      setLastWorkout({
        template_name: (prevSess.template as { name: string } | null)?.name ?? "—",
        date: prevSess.date,
      });
    }

    if (sess && tmpls) {
      setSession(sess);
      const tmpl = tmpls.find((t) => t.id === sess.template_id);
      if (tmpl) {
        setActiveTemplate(tmpl);
        await loadTemplateExercises(tmpl.id);
        await loadSessionSets(sess.id);
      }
    }

    setLoading(false);
  }

  async function loadTemplateExercises(templateId: string) {
    const { data } = await supabase
      .from("template_exercises")
      .select("*, exercise:exercises(*)")
      .eq("template_id", templateId)
      .order("sort_order");
    const items = (data ?? []) as ExerciseWithTemplate[];
    setTemplateExercises(items);
    return items;
  }

  async function loadSessionSets(sessionId: string) {
    const { data } = await supabase.from("workout_sets").select("*").eq("session_id", sessionId).order("set_number");
    const grouped: Record<string, SetRow[]> = {};
    for (const s of data ?? []) {
      if (!grouped[s.exercise_id]) grouped[s.exercise_id] = [];
      grouped[s.exercise_id].push({ setNumber: s.set_number, weight: s.weight_kg?.toString() ?? "", reps: s.reps?.toString() ?? "" });
    }
    setSets(grouped);
  }

  async function pickTemplate(tmpl: WorkoutTemplate) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (navigator.vibrate) navigator.vibrate(10);

    const { data: existing } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existing && existing.template_id !== tmpl.id) {
      showToast("Тренування на сьогодні вже записано", "error");
      return;
    }

    let sess = existing;
    if (!sess) {
      const { data: created } = await supabase
        .from("workout_sessions")
        .insert({ user_id: user.id, template_id: tmpl.id, date: today, started_at: new Date().toISOString() })
        .select()
        .single();
      sess = created;
    }

    setSession(sess);
    setActiveTemplate(tmpl);

    const exs = await loadTemplateExercises(tmpl.id);
    if (existing) {
      await loadSessionSets(existing.id);
    } else {
      const initSets: Record<string, SetRow[]> = {};
      for (const te of exs) {
        const startW = te.starting_weight_kg > 0 ? te.starting_weight_kg.toString() : "";
        initSets[te.exercise_id] = [{ setNumber: 1, weight: startW, reps: "" }];
      }
      setSets(initSets);
    }
  }

  function addSet(exerciseId: string) {
    setSets((prev) => {
      const rows = prev[exerciseId] ?? [];
      const last = rows[rows.length - 1];
      return { ...prev, [exerciseId]: [...rows, { setNumber: rows.length + 1, weight: last?.weight ?? "", reps: last?.reps ?? "" }] };
    });
  }

  function removeSet(exerciseId: string, idx: number) {
    setSets((prev) => {
      const rows = [...(prev[exerciseId] ?? [])];
      rows.splice(idx, 1);
      return { ...prev, [exerciseId]: rows.map((r, i) => ({ ...r, setNumber: i + 1 })) };
    });
  }

  function updateSet(exerciseId: string, idx: number, field: "weight" | "reps", value: string) {
    setSets((prev) => {
      const rows = [...(prev[exerciseId] ?? [])];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, [exerciseId]: rows };
    });
  }

  async function finishWorkout() {
    if (!session) return;
    for (const [exerciseId, exSets] of Object.entries(sets)) {
      await supabase.from("workout_sets").delete().eq("session_id", session.id).eq("exercise_id", exerciseId);
      for (const row of exSets) {
        if (!row.weight && !row.reps) continue;
        await supabase.from("workout_sets").insert({
          session_id: session.id,
          exercise_id: exerciseId,
          set_number: row.setNumber,
          weight_kg: parseFloat(row.weight) || null,
          reps: parseInt(row.reps) || null,
        });
      }
    }
    await supabase.from("workout_sessions").update({ ended_at: new Date().toISOString() }).eq("id", session.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await awardXP(user.id, XP_REWARDS.WORKOUT_LOGGED, "Тренування записано");
      await checkWorkoutAchievements(user.id);
    }
    if (navigator.vibrate) navigator.vibrate([10, 50, 20, 50, 10]);
    showToast("Тренування завершено 💪");
  }

  async function parseAndSaveWorkout() {
    const parsed = parseWorkoutText(freetextWorkout);
    if (parsed.length === 0) { showToast("Не вдалось розпізнати текст", "error"); return; }
    setSavingFreetext(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sess } = await supabase
      .from("workout_sessions")
      .insert({ user_id: user.id, date: today, started_at: new Date().toISOString(), ended_at: new Date().toISOString() })
      .select().single();

    if (sess) {
      for (const item of parsed) {
        let ex = exercises.find((e) => e.name.toLowerCase() === item.exerciseName.toLowerCase());
        if (!ex) {
          const { data: newEx } = await supabase.from("exercises").insert({
            user_id: user.id, name: item.exerciseName, muscle_group: item.muscleGroup, is_custom: true,
          }).select().single();
          if (newEx) { ex = newEx; setExercises((prev) => [...prev, newEx]); }
        }
        if (ex && item.weight > 0) {
          for (let i = 1; i <= item.sets; i++) {
            await supabase.from("workout_sets").insert({
              session_id: sess.id, exercise_id: ex.id, set_number: i, weight_kg: item.weight, reps: item.reps,
            });
          }
        }
      }
      await awardXP(user.id, XP_REWARDS.WORKOUT_LOGGED, "Тренування записано");
      await checkWorkoutAchievements(user.id);
    }

    setParsedPreview(parsed);
    setSavingFreetext(false);
    showToast(`Збережено ${parsed.length} вправ 💪`);
  }

  if (loading) return <div className="py-8 text-center text-[#6b7280]">Завантаження...</div>;

  // ── Active template workout
  if (activeTemplate) {
    return (
      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 mt-4 mb-6">
          <button onClick={() => { setActiveTemplate(null); setSession(null); setTemplateExercises([]); setSets({}); }} className="text-[#6b7280]">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-white font-bold text-lg">{activeTemplate.name}</h2>
        </div>

        {templateExercises.map((te) => {
          const ex = te.exercise;
          const exSets = sets[te.exercise_id] ?? [];
          return (
            <div key={te.id} className="bg-[#1a1a1a] rounded-2xl p-4 mb-3">
              <p className="text-white font-semibold mb-1">{ex.name}</p>
              {te.starting_weight_kg > 0 && exSets.length > 0 && !exSets[0].weight && (
                <p className="text-[#6b7280] text-xs mb-3">Стартова: {te.starting_weight_kg}кг</p>
              )}
              {exSets.map((row, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-[#6b7280] text-sm w-6 text-center">{i + 1}</span>
                  <div className="flex items-center bg-[#111] rounded-xl px-3 h-[44px] flex-1">
                    <input type="text" inputMode="decimal" value={row.weight}
                      onChange={(e) => updateSet(te.exercise_id, i, "weight", e.target.value)}
                      placeholder={te.starting_weight_kg > 0 ? te.starting_weight_kg.toString() : "0"}
                      className="bg-transparent text-white text-center w-full outline-none text-sm" />
                    <span className="text-[#6b7280] text-xs shrink-0">кг</span>
                  </div>
                  <span className="text-[#6b7280] text-sm">×</span>
                  <div className="flex items-center bg-[#111] rounded-xl px-3 h-[44px] w-[68px]">
                    <input type="text" inputMode="numeric" value={row.reps}
                      onChange={(e) => updateSet(te.exercise_id, i, "reps", e.target.value)}
                      placeholder="0" className="bg-transparent text-white text-center w-full outline-none text-sm" />
                  </div>
                  <button onClick={() => removeSet(te.exercise_id, i)} className="p-2">
                    <X size={16} className="text-[#6b7280]" />
                  </button>
                </div>
              ))}
              <button onClick={() => addSet(te.exercise_id)} className="text-[#00FF85] text-sm mt-1">
                + Підхід
              </button>
            </div>
          );
        })}

        <button className="w-full py-3 text-[#6b7280] text-sm border border-dashed border-white/10 rounded-2xl mt-1 mb-2">
          + Додати вправу до тренування
        </button>
        <button onClick={finishWorkout} className="w-full h-[56px] bg-[#00FF85] text-black font-bold rounded-2xl mt-4">
          Завершити тренування
        </button>
      </div>
    );
  }

  // ── Template selection + free-text option
  return (
    <div className="pb-6">
      <p className="text-[#6b7280] text-sm mb-4 mt-4 px-4">Яке тренування сьогодні?</p>

      <div className="flex flex-col gap-3 px-4">
        {templates.length === 0 && (
          <p className="text-[#6b7280] text-sm text-center py-8">Немає шаблонів. Додай в Налаштування → Тіло.</p>
        )}
        {templates.map((tmpl) => (
          <button key={tmpl.id} onClick={() => pickTemplate(tmpl)}
            className="w-full bg-[#1a1a1a] rounded-2xl p-4 flex justify-between items-center border border-white/5 active:border-[#00FF85] transition-colors">
            <p className="text-white font-semibold">{tmpl.name}</p>
            <ChevronRight size={20} className="text-[#6b7280]" />
          </button>
        ))}

        <button onClick={() => setFreetextOpen(true)}
          className="w-full bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-3 border border-dashed border-white/20 text-[#6b7280]">
          <span className="text-xl">📋</span>
          <span className="text-sm font-medium">Вставити текст тренування</span>
        </button>
      </div>

      {lastWorkout && (
        <p className="text-xs text-[#6b7280] mt-4 text-center">
          Останнє: {lastWorkout.template_name} — {format(new Date(lastWorkout.date), "d MMM")}
        </p>
      )}

      {parsedPreview.length > 0 && (
        <div className="bg-[#111111] rounded-2xl p-4 mt-4 mx-4">
          <p className="text-[#00FF85] text-sm font-semibold mb-3">✅ Розпізнано {parsedPreview.length} вправ:</p>
          {parsedPreview.map((item, i) => (
            <div key={i} className="py-1.5 border-b border-white/5 last:border-0">
              <p className="text-white text-sm">
                <span className="text-[#6b7280] capitalize">{item.muscleGroup}</span>
                {item.muscleGroup && " · "}
                {item.exerciseName}
                {item.weight > 0 && (
                  <span className="text-[#00FF85]"> {item.weight}кг × {item.reps} × {item.sets}</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      <BottomSheet open={freetextOpen} onClose={() => setFreetextOpen(false)} title="Тренування текстом">
        <div className="space-y-4 pb-6">
          <p className="text-[#6b7280] text-xs">
            Формат: група: вправа вага на повтори на підходи
          </p>
          <textarea
            value={freetextWorkout}
            onChange={(e) => setFreetextWorkout(e.target.value)}
            placeholder={"груди: жим 72,5 на 5 на 5\nспина: станова 90 на 5 на 5\nбіцепс: молоточки 14 на 8 на 3"}
            className="w-full h-[200px] bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none resize-none font-mono"
            style={{ fontSize: "16px" }}
          />
          <Button onClick={async () => { await parseAndSaveWorkout(); setFreetextOpen(false); }}
            disabled={!freetextWorkout.trim() || savingFreetext}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
            {savingFreetext ? "Збереження..." : "Зберегти тренування"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
