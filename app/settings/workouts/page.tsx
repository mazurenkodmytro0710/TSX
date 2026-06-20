"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlusCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutTemplate, TemplateExercise, Exercise } from "@/lib/types";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toaster";

export default function WorkoutTemplatesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateExercises, setTemplateExercises] = useState<Record<string, TemplateExercise[]>>({});
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [addExerciseForTemplate, setAddExerciseForTemplate] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [startingWeight, setStartingWeight] = useState("0");
  const [setsTarget, setSetsTarget] = useState("3");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: tmpl }, { data: exs }] = await Promise.all([
      supabase.from("workout_templates").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("exercises").select("*").eq("user_id", user.id).order("name"),
    ]);
    setTemplates(tmpl ?? []);
    setExercises(exs ?? []);

    const teMap: Record<string, TemplateExercise[]> = {};
    for (const t of tmpl ?? []) {
      const { data: te } = await supabase
        .from("template_exercises")
        .select("*, exercise:exercises(*)")
        .eq("template_id", t.id)
        .order("sort_order");
      teMap[t.id] = te ?? [];
    }
    setTemplateExercises(teMap);
    setLoading(false);
  }

  async function addTemplate() {
    if (!newTemplateName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workout_templates").insert({
      user_id: user.id,
      name: newTemplateName.trim(),
      sort_order: templates.length,
    });
    setNewTemplateName("");
    setAddTemplateOpen(false);
    showToast("Шаблон створено");
    await load();
  }

  async function deleteTemplate(id: string) {
    await supabase.from("template_exercises").delete().eq("template_id", id);
    await supabase.from("workout_templates").delete().eq("id", id);
    showToast("Шаблон видалено");
    await load();
  }

  async function addExerciseToTemplate() {
    if (!addExerciseForTemplate || !selectedExerciseId) return;
    const existing = templateExercises[addExerciseForTemplate] ?? [];
    await supabase.from("template_exercises").insert({
      template_id: addExerciseForTemplate,
      exercise_id: selectedExerciseId,
      sort_order: existing.length,
      starting_weight_kg: parseFloat(startingWeight) || 0,
      sets_target: parseInt(setsTarget) || 3,
    });
    setAddExerciseForTemplate(null);
    setSelectedExerciseId("");
    setStartingWeight("0");
    setSetsTarget("3");
    showToast("Вправу додано");
    await load();
  }

  async function removeExerciseFromTemplate(teId: string, templateId: string) {
    await supabase.from("template_exercises").delete().eq("id", teId);
    await load();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe">
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[#6b7280] p-1 -ml-1">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-white">Шаблони тренувань</h1>
        </div>
        <button onClick={() => setAddTemplateOpen(true)} className="text-[#00FF85] p-1">
          <PlusCircle size={22} />
        </button>
      </header>

      <div className="px-4 pb-24 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-[#6b7280]">Завантаження...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm mb-4">Немає шаблонів</p>
            <button
              onClick={() => setAddTemplateOpen(true)}
              className="text-[#00FF85] font-semibold flex items-center gap-1.5 mx-auto text-sm"
            >
              <PlusCircle size={14} /> Створити перший шаблон
            </button>
          </div>
        ) : templates.map((tmpl) => {
          const te = templateExercises[tmpl.id] ?? [];
          const isOpen = expanded[tmpl.id];
          return (
            <div key={tmpl.id} className="bg-[#111111] rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded((p) => ({ ...p, [tmpl.id]: !isOpen }))}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="text-left">
                  <p className="text-white font-semibold">{tmpl.name}</p>
                  <p className="text-[#6b7280] text-xs">{te.length} вправ</p>
                </div>
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronUp size={16} className="text-[#6b7280]" /> : <ChevronDown size={16} className="text-[#6b7280]" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
                  {te.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">{item.exercise?.name}</p>
                        <p className="text-[#6b7280] text-xs">
                          {item.sets_target} підх · {item.starting_weight_kg} кг старт
                        </p>
                      </div>
                      <button
                        onClick={() => removeExerciseFromTemplate(item.id, tmpl.id)}
                        className="text-[#ef4444]/60 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setAddExerciseForTemplate(tmpl.id); setSelectedExerciseId(""); }}
                      className="flex items-center gap-1.5 text-[#00FF85] text-xs font-semibold"
                    >
                      <PlusCircle size={12} /> Додати вправу
                    </button>
                    <span className="flex-1" />
                    <button
                      onClick={() => deleteTemplate(tmpl.id)}
                      className="text-[#ef4444]/60 text-xs"
                    >
                      Видалити шаблон
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add template */}
      <BottomSheet open={addTemplateOpen} onClose={() => setAddTemplateOpen(false)} title="Новий шаблон">
        <div className="space-y-4 pb-6">
          <div>
            <Label className="text-[#6b7280] text-xs">Назва</Label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Full Body A"
              className="mt-1.5 bg-[#1a1a1a] border-white/10 text-white h-12"
              autoFocus
            />
          </div>
          <Button
            onClick={addTemplate}
            disabled={!newTemplateName.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl"
          >
            Створити
          </Button>
        </div>
      </BottomSheet>

      {/* Add exercise to template */}
      <BottomSheet
        open={addExerciseForTemplate !== null}
        onClose={() => setAddExerciseForTemplate(null)}
        title="Додати вправу"
      >
        <div className="space-y-4 pb-6">
          <div>
            <Label className="text-[#6b7280] text-xs mb-2 block">Вправа</Label>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {exercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all",
                    selectedExerciseId === ex.id
                      ? "bg-[#00FF85] text-black font-semibold"
                      : "bg-[#1a1a1a] text-white"
                  )}
                >
                  {ex.name}
                  <span className="text-xs ml-2 opacity-60">{ex.muscle_group}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#6b7280] text-xs">Стартова вага (кг)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={startingWeight}
                onChange={(e) => setStartingWeight(e.target.value)}
                className="mt-1.5 bg-[#1a1a1a] border-white/10 text-white h-11"
              />
            </div>
            <div>
              <Label className="text-[#6b7280] text-xs">Кількість підходів</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={setsTarget}
                onChange={(e) => setSetsTarget(e.target.value)}
                className="mt-1.5 bg-[#1a1a1a] border-white/10 text-white h-11"
              />
            </div>
          </div>
          <Button
            onClick={addExerciseToTemplate}
            disabled={!selectedExerciseId}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl"
          >
            Додати
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
