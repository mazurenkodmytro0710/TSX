"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile, ExpenseCategory, Skill, Habit,
  WorkoutTemplate, TemplateExercise, Exercise, FinanceAccount,
} from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Trash2, Plus, ChevronDown, ChevronUp, Eye, EyeOff, Check } from "lucide-react";
import { showToast } from "@/components/ui/Toaster";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

type TabId = "profile" | "body" | "skills" | "finance" | "ai" | "account";
type FinanceSub = "accounts" | "categories";

const TABS = [
  { id: "profile" as TabId, label: "Профіль", icon: "👤" },
  { id: "body"    as TabId, label: "Тіло",    icon: "💪" },
  { id: "skills"  as TabId, label: "Скіли",   icon: "🎯" },
  { id: "finance" as TabId, label: "Фінанси", icon: "💰" },
  { id: "ai"      as TabId, label: "AI",      icon: "🤖" },
  { id: "account" as TabId, label: "Акаунт",  icon: "⚙️" },
];

const EMOJI_LIST = [
  "🛒","🚗","🎮","✈️","💊","👕","🏠","📱","🍕","☕",
  "💈","🎓","💪","📚","🐾","🎵","🍺","💡","🔧","💰",
  "🎁","🏥","✂️","🌿","🎯","🏋️","💻","🚌","🍔","🎪",
];

const SKILL_EMOJIS = [
  "💪","🧠","📚","🎯","🗣️","💻","🎵","✏️","🏃","🧘",
  "💰","🌿","🎨","📸","🔬","🤝","🌍","⭐","🔥","🚀",
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Profile
  const [form, setForm] = useState({
    name: "",
    goal_start_date: "",
    sleep_target_time: "23:00",
    daily_reminder_time: "20:00",
  });
  const [pointB, setPointB] = useState({ body: "", money: "", social: "", skills: "" });

  // ── Body
  const [calorieGoal, setCalorieGoal] = useState("2800");
  const [proteinGoal, setProteinGoal] = useState("180");
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateExercises, setTemplateExercises] = useState<Record<string, TemplateExercise[]>>({});
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [addExerciseFor, setAddExerciseFor] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [startingWeight, setStartingWeight] = useState("0");
  const [setsTarget, setSetsTarget] = useState("3");

  // ── Skills
  const [skills, setSkills] = useState<Skill[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [addingHabitFor, setAddingHabitFor] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState<"checkbox" | "note" | "counter">("checkbox");
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillEmoji, setNewSkillEmoji] = useState("⭐");

  // ── Finance
  const [financeSub, setFinanceSub] = useState<FinanceSub>("accounts");
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccCurrency, setNewAccCurrency] = useState<"UAH" | "EUR" | "USD">("EUR");
  const [newAccBalance, setNewAccBalance] = useState("0");
  const [newAccSavings, setNewAccSavings] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [subcatsMap, setSubcatsMap] = useState<Record<string, ExpenseCategory[]>>({});
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("🛒");

  // ── AI
  const [grokKey, setGrokKey] = useState("");
  const [showGrokKey, setShowGrokKey] = useState(false);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [
      { data: prof },
      { data: cats },
      { data: sk },
      { data: hab },
      { data: accnts },
      { data: reps },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("expense_categories").select("*").eq("user_id", user.id).is("parent_id", null).order("created_at"),
      supabase.from("skills").select("*").eq("user_id", user.id).eq("is_active", true).order("sort_order"),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("finance_accounts").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("ai_reports").select("generated_at").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1),
    ]);

    if (prof) {
      setProfile(prof);
      setForm({
        name: prof.name ?? "",
        goal_start_date: prof.goal_start_date ?? "",
        sleep_target_time: prof.sleep_target_time ?? "23:00",
        daily_reminder_time: prof.daily_reminder_time ?? "20:00",
      });
      setPointB({
        body: (prof.point_b as Record<string, string> | null)?.body ?? "",
        money: (prof.point_b as Record<string, string> | null)?.money ?? "",
        social: (prof.point_b as Record<string, string> | null)?.social ?? "",
        skills: (prof.point_b as Record<string, string> | null)?.skills ?? "",
      });
      setCalorieGoal(String(prof.calorie_goal ?? 2800));
      setProteinGoal(String(prof.protein_goal ?? 180));
      setGrokKey(prof.grok_api_key ?? "");
    }

    setCategories(cats ?? []);
    setSkills(sk ?? []);
    setHabits(hab ?? []);
    setAccounts(accnts ?? []);
    setLastReportDate(reps?.[0]?.generated_at ?? null);

    const [{ data: tmpls }, { data: exs }] = await Promise.all([
      supabase.from("workout_templates").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("exercises").select("*").eq("user_id", user.id).order("name"),
    ]);
    setTemplates(tmpls ?? []);
    setExercises(exs ?? []);

    const teMap: Record<string, TemplateExercise[]> = {};
    for (const t of tmpls ?? []) {
      const { data: te } = await supabase
        .from("template_exercises")
        .select("*, exercise:exercises(*)")
        .eq("template_id", t.id)
        .order("sort_order");
      teMap[t.id] = te ?? [];
    }
    setTemplateExercises(teMap);
  }

  // ── Profile save
  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({
      name: form.name,
      goal_start_date: form.goal_start_date || null,
      sleep_target_time: form.sleep_target_time,
      daily_reminder_time: form.daily_reminder_time,
      point_b: pointB,
    }).eq("id", user.id);
    setSaving(false);
    showToast("Профіль збережено ✓");
  }

  // ── Body save
  async function saveBody() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({
      calorie_goal: parseInt(calorieGoal) || 2800,
      protein_goal: parseInt(proteinGoal) || 180,
    }).eq("id", user.id);
    setSaving(false);
    showToast("Збережено ✓");
  }

  // ── Template functions
  async function addTemplate() {
    if (!newTemplateName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workout_templates").insert({ user_id: user.id, name: newTemplateName.trim(), sort_order: templates.length });
    setNewTemplateName("");
    setAddTemplateOpen(false);
    showToast("Шаблон створено");
    await load();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Видалити шаблон?")) return;
    await supabase.from("template_exercises").delete().eq("template_id", id);
    await supabase.from("workout_templates").delete().eq("id", id);
    showToast("Шаблон видалено");
    await load();
  }

  async function addExerciseToTemplate() {
    if (!addExerciseFor || !selectedExerciseId) return;
    const existing = templateExercises[addExerciseFor] ?? [];
    await supabase.from("template_exercises").insert({
      template_id: addExerciseFor,
      exercise_id: selectedExerciseId,
      sort_order: existing.length,
      starting_weight_kg: parseFloat(startingWeight) || 0,
      sets_target: parseInt(setsTarget) || 3,
    });
    setAddExerciseFor(null);
    setSelectedExerciseId("");
    setStartingWeight("0");
    setSetsTarget("3");
    showToast("Вправу додано");
    await load();
  }

  async function removeExercise(teId: string) {
    await supabase.from("template_exercises").delete().eq("id", teId);
    await load();
  }

  // ── Skill functions
  async function addSkill() {
    if (!newSkillName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("skills").insert({
      user_id: user.id, name: newSkillName.trim(), icon: newSkillEmoji,
      category: "custom", color: "#00FF85", sort_order: skills.length,
    });
    setNewSkillName("");
    setNewSkillEmoji("⭐");
    setAddSkillOpen(false);
    showToast("Скіл додано ✓");
    await load();
  }

  async function deleteSkill(id: string) {
    if (!confirm("Видалити скіл і всі його звички?")) return;
    await supabase.from("habits").delete().eq("skill_id", id);
    await supabase.from("skills").update({ is_active: false }).eq("id", id);
    showToast("Скіл видалено");
    await load();
  }

  async function confirmAddHabit(skillId: string) {
    if (!newHabitName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const skillHabits = habits.filter((h) => h.skill_id === skillId);
    await supabase.from("habits").insert({
      user_id: user.id, skill_id: skillId, name: newHabitName.trim(),
      type: newHabitType, sort_order: skillHabits.length, is_active: true,
    });
    setAddingHabitFor(null);
    setNewHabitName("");
    setNewHabitType("checkbox");
    showToast("Звичку додано ✓");
    await load();
  }

  async function deleteHabit(id: string) {
    await supabase.from("habits").delete().eq("id", id);
    await load();
  }

  // ── Finance categories
  async function loadSubcats(catId: string) {
    const { data } = await supabase.from("expense_categories").select("*").eq("parent_id", catId).order("created_at");
    setSubcatsMap((p) => ({ ...p, [catId]: data ?? [] }));
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("expense_categories").insert({ user_id: user.id, name: newCatName.trim(), icon: newCatEmoji, color: "#6b7280", parent_id: null });
    setNewCatName(""); setNewCatEmoji("🛒"); setAddCatOpen(false);
    await load();
    showToast("Категорію додано ✓");
  }

  async function deleteCategory(id: string) {
    if (!confirm("Видалити категорію?")) return;
    await supabase.from("expense_categories").delete().eq("parent_id", id);
    await supabase.from("expense_categories").delete().eq("id", id);
    await load();
    showToast("Видалено");
  }

  async function addSubcategory(parentId: string) {
    if (!newSubName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("expense_categories").insert({ user_id: user.id, name: newSubName.trim(), icon: "▸", color: "#6b7280", parent_id: parentId });
    setNewSubName(""); setAddingSubFor(null);
    await loadSubcats(parentId);
    showToast("Підкатегорію додано ✓");
  }

  async function deleteSubcat(id: string, parentId: string) {
    await supabase.from("expense_categories").delete().eq("id", id);
    await loadSubcats(parentId);
  }

  // ── Finance accounts
  async function addAccount() {
    if (!newAccName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_accounts").insert({
      user_id: user.id, name: newAccName.trim(), currency: newAccCurrency,
      current_balance: parseFloat(newAccBalance) || 0,
      is_savings: newAccSavings, include_in_total: true,
      icon: newAccSavings ? "🏦" : "💳", sort_order: accounts.length,
    });
    setNewAccName(""); setNewAccCurrency("EUR"); setNewAccBalance("0"); setNewAccSavings(false);
    setAddAccountOpen(false);
    await load();
    showToast("Рахунок додано ✓");
  }

  async function deleteAccount(id: string) {
    if (!confirm("Видалити рахунок?")) return;
    await supabase.from("finance_accounts").delete().eq("id", id);
    await load();
    showToast("Видалено");
  }

  // ── AI
  async function saveGrokKey() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ grok_api_key: grokKey || null }).eq("id", user.id);
    showToast("API ключ збережено ✓");
  }

  // ── Account
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function exportData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [p, sk, hab, lg, nt, tx] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id),
      supabase.from("skills").select("*").eq("user_id", user.id),
      supabase.from("habits").select("*").eq("user_id", user.id),
      supabase.from("daily_logs").select("*").eq("user_id", user.id),
      supabase.from("notes").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("*").eq("user_id", user.id),
    ]);
    const blob = new Blob([JSON.stringify({ profile: p.data, skills: sk.data, habits: hab.data, logs: lg.data, notes: nt.data, transactions: tx.data, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `t6x-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-black text-white">⚙️ Налаштування</h1>
      </header>

      {/* ── Tab bar ── */}
      <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-white/5 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors",
              activeTab === tab.id ? "bg-[#00FF85] text-black" : "bg-[#1a1a1a] text-gray-400"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 py-4 pb-24">

        {/* ════ ПРОФІЛЬ ════ */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div>
              <Label className="text-[#6b7280] text-xs">Ім&apos;я</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1.5 bg-[#111111] border-white/10 text-white h-12" />
            </div>
            <div>
              <Label className="text-[#6b7280] text-xs">Дата початку сезону</Label>
              <Input type="date" value={form.goal_start_date} onChange={(e) => setForm((f) => ({ ...f, goal_start_date: e.target.value }))}
                className="mt-1.5 bg-[#111111] border-white/10 text-white h-12" />
            </div>
            <div>
              <Label className="text-[#6b7280] text-xs">Ціль — Point B (тіло)</Label>
              <Textarea value={pointB.body} onChange={(e) => setPointB((p) => ({ ...p, body: e.target.value }))}
                placeholder="Якого тіла хочу досягти?" rows={2}
                className="mt-1.5 bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none" />
            </div>
            <div>
              <Label className="text-[#6b7280] text-xs">Ціль — Point B (фінанси)</Label>
              <Textarea value={pointB.money} onChange={(e) => setPointB((p) => ({ ...p, money: e.target.value }))}
                placeholder="Фінансова ціль?" rows={2}
                className="mt-1.5 bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none" />
            </div>
            <div>
              <Label className="text-[#6b7280] text-xs">Ціль — Point B (скіли)</Label>
              <Textarea value={pointB.skills} onChange={(e) => setPointB((p) => ({ ...p, skills: e.target.value }))}
                placeholder="Яких навичок хочу досягти?" rows={2}
                className="mt-1.5 bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#6b7280] text-xs">Час відбою</Label>
                <Input type="time" value={form.sleep_target_time} onChange={(e) => setForm((f) => ({ ...f, sleep_target_time: e.target.value }))}
                  className="mt-1.5 bg-[#111111] border-white/10 text-white h-12" />
              </div>
              <div>
                <Label className="text-[#6b7280] text-xs">Нагадування</Label>
                <Input type="time" value={form.daily_reminder_time} onChange={(e) => setForm((f) => ({ ...f, daily_reminder_time: e.target.value }))}
                  className="mt-1.5 bg-[#111111] border-white/10 text-white h-12" />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving}
              className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
              {saving ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        )}

        {/* ════ ТІЛО ════ */}
        {activeTab === "body" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#6b7280] text-xs">Калорії/день</Label>
                <Input type="text" inputMode="numeric" value={calorieGoal} onChange={(e) => setCalorieGoal(e.target.value)}
                  className="mt-1.5 bg-[#111111] border-white/10 text-white h-12" />
              </div>
              <div>
                <Label className="text-[#6b7280] text-xs">Білок (г)</Label>
                <Input type="text" inputMode="numeric" value={proteinGoal} onChange={(e) => setProteinGoal(e.target.value)}
                  className="mt-1.5 bg-[#111111] border-white/10 text-white h-12" />
              </div>
            </div>
            <Button onClick={saveBody} disabled={saving} className="w-full h-11 bg-[#00FF85] text-black font-bold rounded-2xl">
              {saving ? "..." : "Зберегти"}
            </Button>

            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm">Шаблони тренувань</p>
                <button onClick={() => setAddTemplateOpen(true)} className="text-[#00FF85] flex items-center gap-1 text-xs font-semibold">
                  <Plus size={14} /> Додати
                </button>
              </div>

              <div className="space-y-2">
                {templates.length === 0 && (
                  <p className="text-[#6b7280] text-sm text-center py-4">Немає шаблонів</p>
                )}
                {templates.map((tmpl) => {
                  const te = templateExercises[tmpl.id] ?? [];
                  const isOpen = expandedTemplateId === tmpl.id;
                  return (
                    <div key={tmpl.id} className="bg-[#111111] rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedTemplateId(isOpen ? null : tmpl.id)}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm">{tmpl.name}</p>
                          <p className="text-[#6b7280] text-xs">{te.length} вправ</p>
                        </div>
                        {isOpen ? <ChevronUp size={16} className="text-[#6b7280]" /> : <ChevronDown size={16} className="text-[#6b7280]" />}
                      </button>

                      {isOpen && (
                        <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-2">
                          {te.map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                              <div>
                                <p className="text-white text-sm">{item.exercise?.name}</p>
                                <p className="text-[#6b7280] text-xs">{item.sets_target} підх · {item.starting_weight_kg} кг</p>
                              </div>
                              <button onClick={() => removeExercise(item.id)} className="text-[#ef4444]/60 p-1">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                          <div className="flex justify-between pt-1">
                            <button
                              onClick={() => { setAddExerciseFor(tmpl.id); setSelectedExerciseId(""); }}
                              className="text-[#00FF85] text-xs font-semibold flex items-center gap-1"
                            >
                              <Plus size={12} /> Додати вправу
                            </button>
                            <button onClick={() => deleteTemplate(tmpl.id)} className="text-[#ef4444]/50 text-xs">
                              Видалити
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════ СКІЛИ ════ */}
        {activeTab === "skills" && (
          <div className="space-y-3">
            {skills.map((skill) => {
              const skillHabits = habits.filter((h) => h.skill_id === skill.id);
              const isOpen = expandedSkillId === skill.id;
              return (
                <div key={skill.id} className="bg-[#111111] rounded-2xl overflow-hidden">
                  <div className="flex items-center p-4 gap-3">
                    <button
                      onClick={() => setExpandedSkillId(isOpen ? null : skill.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <span className="text-2xl">{skill.icon}</span>
                      <div>
                        <p className="text-white font-semibold">{skill.name}</p>
                        <p className="text-[#6b7280] text-xs">{skillHabits.length} звичок</p>
                      </div>
                    </button>
                    <button onClick={() => setExpandedSkillId(isOpen ? null : skill.id)} className="text-[#6b7280]">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => deleteSkill(skill.id)} className="text-[#6b7280] active:text-[#ef4444] p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-2">
                      {skillHabits.map((h) => (
                        <div key={h.id} className="flex items-center gap-2">
                          <span className="text-[#6b7280] text-xs shrink-0">└</span>
                          <span className="text-white/80 text-sm flex-1">{h.name}</span>
                          <span className="text-[#4b5563] text-[10px]">
                            {h.type === "checkbox" ? "✓" : h.type === "note" ? "📝" : "#"}
                          </span>
                          <button onClick={() => deleteHabit(h.id)} className="text-[#6b7280] active:text-[#ef4444] p-1">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      {/* Inline add habit */}
                      {addingHabitFor === skill.id ? (
                        <div className="pt-1 space-y-2">
                          <Input
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            placeholder="Назва звички"
                            autoFocus
                            className="bg-[#1a1a1a] border-white/10 text-white h-10 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmAddHabit(skill.id);
                              if (e.key === "Escape") { setAddingHabitFor(null); setNewHabitName(""); }
                            }}
                          />
                          <div className="flex gap-2">
                            {(["checkbox", "note", "counter"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => setNewHabitType(t)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                  newHabitType === t ? "bg-[#00FF85] text-black" : "bg-[#1a1a1a] text-[#6b7280]"
                                )}
                              >
                                {t === "checkbox" ? "Галочка" : t === "note" ? "З нотаткою" : "Лічильник"}
                              </button>
                            ))}
                            <button
                              onClick={() => confirmAddHabit(skill.id)}
                              className="w-9 h-9 bg-[#00FF85]/20 rounded-lg flex items-center justify-center text-[#00FF85]"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingHabitFor(skill.id); setNewHabitName(""); setNewHabitType("checkbox"); }}
                          className="flex items-center gap-1.5 text-[#6b7280] text-xs pt-1"
                        >
                          <Plus size={12} /> Додати звичку
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => { setAddSkillOpen(true); setNewSkillName(""); setNewSkillEmoji("⭐"); }}
              className="w-full bg-[#111111]/50 border border-dashed border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 text-[#6b7280] text-sm"
            >
              <Plus size={16} /> Додати скіл
            </button>
          </div>
        )}

        {/* ════ ФІНАНСИ ════ */}
        {activeTab === "finance" && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#1a1a1a] rounded-2xl">
              {(["accounts", "categories"] as FinanceSub[]).map((s) => (
                <button key={s} onClick={() => setFinanceSub(s)}
                  className={cn("py-2.5 rounded-xl text-xs font-semibold transition-all",
                    financeSub === s ? "bg-[#00FF85] text-black" : "text-[#6b7280]")}>
                  {s === "accounts" ? "Рахунки" : "Категорії"}
                </button>
              ))}
            </div>

            {/* Рахунки */}
            {financeSub === "accounts" && (
              <div className="space-y-3">
                {accounts.length === 0 && (
                  <p className="text-[#6b7280] text-sm text-center py-4">Немає рахунків</p>
                )}
                {accounts.map((acc) => (
                  <div key={acc.id} className="bg-[#111111] rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{acc.icon}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{acc.name}</p>
                        <p className="text-[#6b7280] text-xs">{acc.currency} · {acc.current_balance}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteAccount(acc.id)} className="text-[#6b7280] active:text-[#ef4444] p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setAddAccountOpen(true)}
                  className="w-full bg-[#111111]/50 border border-dashed border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 text-[#6b7280] text-sm"
                >
                  <Plus size={16} /> Додати рахунок
                </button>
              </div>
            )}

            {/* Категорії */}
            {financeSub === "categories" && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button onClick={() => setAddCatOpen(true)}
                    className="flex items-center gap-1 text-[#00FF85] text-xs font-semibold">
                    <Plus size={14} /> Додати
                  </button>
                </div>
                <div className="bg-[#111111] rounded-2xl overflow-hidden">
                  {categories.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-[#6b7280] text-sm">Немає категорій</p>
                    </div>
                  )}
                  {categories.map((cat, idx) => {
                    const isExpanded = expandedCatId === cat.id;
                    const subs = subcatsMap[cat.id] ?? [];
                    return (
                      <div key={cat.id} className={cn(idx < categories.length - 1 && "border-b border-white/5")}>
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <span className="text-xl shrink-0">{cat.icon}</span>
                          <p className="text-white text-sm font-medium flex-1">{cat.name}</p>
                          <button
                            onClick={() => {
                              const next = isExpanded ? null : cat.id;
                              setExpandedCatId(next);
                              if (next) loadSubcats(next);
                            }}
                            className="text-[#6b7280]"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button onClick={() => deleteCategory(cat.id)} className="w-8 h-8 flex items-center justify-center text-[#6b7280] active:text-[#ef4444]">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="bg-[#0f0f0f] pb-2">
                            {subs.map((s) => (
                              <div key={s.id} className="flex items-center gap-2 px-6 py-2 border-t border-white/5">
                                <span className="text-[#6b7280] text-xs">└</span>
                                <span className="text-white/70 text-sm flex-1">{s.name}</span>
                                <button onClick={() => deleteSubcat(s.id, cat.id)} className="w-6 h-6 flex items-center justify-center text-[#6b7280] active:text-[#ef4444]">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            {addingSubFor === cat.id ? (
                              <div className="flex items-center gap-2 px-4 pt-2">
                                <Input
                                  value={newSubName}
                                  onChange={(e) => setNewSubName(e.target.value)}
                                  placeholder="Назва підкатегорії..."
                                  autoFocus
                                  className="flex-1 bg-[#1a1a1a] border-white/10 text-white h-9 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addSubcategory(cat.id);
                                    if (e.key === "Escape") { setAddingSubFor(null); setNewSubName(""); }
                                  }}
                                />
                                <button onClick={() => addSubcategory(cat.id)}
                                  className="w-9 h-9 bg-[#00FF85]/20 rounded-xl flex items-center justify-center text-[#00FF85]">
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddingSubFor(cat.id); setNewSubName(""); }}
                                className="flex items-center gap-1.5 px-6 py-2 text-[#6b7280] text-xs"
                              >
                                <Plus size={12} /> Додати підкатегорію
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ AI ════ */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div>
              <Label className="text-[#6b7280] text-xs">Grok API Key</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showGrokKey ? "text" : "password"}
                  value={grokKey}
                  onChange={(e) => setGrokKey(e.target.value)}
                  placeholder="xai-..."
                  className="bg-[#111111] border-white/10 text-white h-12 pr-11"
                />
                <button
                  onClick={() => setShowGrokKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
                >
                  {showGrokKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button onClick={saveGrokKey} className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
              Зберегти ключ
            </Button>
            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-[#6b7280] text-xs leading-relaxed">
                Використовується для тижневого AI звіту щопонеділка о 8:00.
              </p>
              {lastReportDate && (
                <p className="text-[#6b7280] text-xs mt-2">
                  Останній звіт: {format(new Date(lastReportDate), "d MMM yyyy, HH:mm", { locale: uk })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ════ АКАУНТ ════ */}
        {activeTab === "account" && (
          <div className="space-y-3">
            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-[#6b7280] text-xs mb-1">Email</p>
              <p className="text-white text-sm">{profile?.id ?? "—"}</p>
            </div>

            <div className="bg-[#111111] rounded-2xl overflow-hidden divide-y divide-white/5">
              <button onClick={exportData} className="w-full flex items-center justify-between px-4 py-4 text-left">
                <span className="text-white text-sm">Експортувати дані JSON</span>
                <span className="text-[#6b7280] text-lg">↓</span>
              </button>
              <button onClick={() => showToast("Буде реалізовано у наступному релізі")} className="w-full flex items-center justify-between px-4 py-4 text-left">
                <span className="text-white text-sm">Експортувати в Obsidian</span>
                <span className="text-[#6b7280] text-lg">↓</span>
              </button>
            </div>

            <div className="bg-[#111111] rounded-2xl overflow-hidden divide-y divide-white/5">
              <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-4">
                <LogOut size={18} className="text-[#6b7280]" />
                <span className="text-white text-sm">Вийти з акаунту</span>
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Видалити акаунт і всі дані? Це незворотньо.")) return;
                  await supabase.auth.signOut();
                  router.push("/login");
                }}
                className="w-full flex items-center gap-3 px-4 py-4"
              >
                <Trash2 size={18} className="text-[#ef4444]" />
                <span className="text-[#ef4444] text-sm">Видалити акаунт</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add template ── */}
      <BottomSheet open={addTemplateOpen} onClose={() => setAddTemplateOpen(false)} title="Новий шаблон">
        <div className="space-y-4 pb-6">
          <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Full Body A" autoFocus
            className="bg-[#1a1a1a] border-white/10 text-white h-12" />
          <Button onClick={addTemplate} disabled={!newTemplateName.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
            Створити
          </Button>
        </div>
      </BottomSheet>

      {/* ── Add exercise ── */}
      <BottomSheet open={addExerciseFor !== null} onClose={() => setAddExerciseFor(null)} title="Додати вправу">
        <div className="space-y-4 pb-6">
          <div className="max-h-52 overflow-y-auto space-y-1">
            {exercises.map((ex) => (
              <button key={ex.id} onClick={() => setSelectedExerciseId(ex.id)}
                className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all",
                  selectedExerciseId === ex.id ? "bg-[#00FF85] text-black font-semibold" : "bg-[#1a1a1a] text-white")}>
                {ex.name} <span className="text-xs opacity-60">{ex.muscle_group}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#6b7280] text-xs">Стартова вага (кг)</Label>
              <Input type="text" inputMode="decimal" value={startingWeight} onChange={(e) => setStartingWeight(e.target.value)}
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-11" />
            </div>
            <div>
              <Label className="text-[#6b7280] text-xs">Підходів</Label>
              <Input type="text" inputMode="numeric" value={setsTarget} onChange={(e) => setSetsTarget(e.target.value)}
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-11" />
            </div>
          </div>
          <Button onClick={addExerciseToTemplate} disabled={!selectedExerciseId}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
            Додати
          </Button>
        </div>
      </BottomSheet>

      {/* ── Add skill ── */}
      <BottomSheet open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="Новий скіл">
        <div className="space-y-4 pb-6">
          <div>
            <p className="text-[#6b7280] text-xs mb-2">Іконка</p>
            <div className="grid grid-cols-10 gap-1.5">
              {SKILL_EMOJIS.map((e) => (
                <button key={e} onClick={() => setNewSkillEmoji(e)}
                  className={cn("h-9 rounded-xl flex items-center justify-center text-lg border transition-all",
                    newSkillEmoji === e ? "border-[#00FF85] bg-[#00FF85]/10" : "border-white/10 bg-[#1a1a1a]")}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Input value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Назва скіла"
            className="bg-[#1a1a1a] border-white/10 text-white h-12" />
          <Button onClick={addSkill} disabled={!newSkillName.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
            Створити скіл
          </Button>
        </div>
      </BottomSheet>

      {/* ── Add account ── */}
      <BottomSheet open={addAccountOpen} onClose={() => setAddAccountOpen(false)} title="Новий рахунок">
        <div className="space-y-4 pb-6">
          <div>
            <Label className="text-[#6b7280] text-xs">Назва</Label>
            <Input value={newAccName} onChange={(e) => setNewAccName(e.target.value)}
              placeholder="Основний рахунок" autoFocus
              className="mt-1.5 bg-[#1a1a1a] border-white/10 text-white h-12" />
          </div>
          <div>
            <Label className="text-[#6b7280] text-xs mb-2 block">Валюта</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["UAH", "EUR", "USD"] as const).map((c) => (
                <button key={c} onClick={() => setNewAccCurrency(c)}
                  className={cn("py-2.5 rounded-xl text-sm font-semibold transition-all",
                    newAccCurrency === c ? "bg-[#00FF85] text-black" : "bg-[#1a1a1a] text-[#6b7280]")}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[#6b7280] text-xs">Початковий баланс</Label>
            <Input type="text" inputMode="decimal" value={newAccBalance} onChange={(e) => setNewAccBalance(e.target.value)}
              className="mt-1.5 bg-[#1a1a1a] border-white/10 text-white h-12" />
          </div>
          <button
            onClick={() => setNewAccSavings((v) => !v)}
            className="flex items-center gap-3 w-full"
          >
            <div className={cn("w-10 h-6 rounded-full transition-colors", newAccSavings ? "bg-[#00FF85]" : "bg-[#1a1a1a]")}>
              <div className={cn("w-4 h-4 rounded-full bg-white mt-1 transition-all", newAccSavings ? "ml-5" : "ml-1")} />
            </div>
            <span className="text-white text-sm">Накопичувальний</span>
          </button>
          <Button onClick={addAccount} disabled={!newAccName.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
            Створити рахунок
          </Button>
        </div>
      </BottomSheet>

      {/* ── Add category ── */}
      <BottomSheet open={addCatOpen} onClose={() => setAddCatOpen(false)} title="Нова категорія">
        <div className="space-y-5 pb-6">
          <div>
            <p className="text-[#6b7280] text-xs mb-2">Іконка</p>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_LIST.map((emoji) => (
                <button key={emoji} onClick={() => setNewCatEmoji(emoji)}
                  className={cn("h-11 rounded-xl flex items-center justify-center text-xl border transition-all",
                    newCatEmoji === emoji ? "border-[#00FF85] bg-[#00FF85]/10" : "border-white/10 bg-[#1a1a1a]")}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Назва категорії"
            className="bg-[#1a1a1a] border-white/10 text-white h-12 text-base"
            onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <Button onClick={addCategory} disabled={!newCatName.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
            Зберегти категорію
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
