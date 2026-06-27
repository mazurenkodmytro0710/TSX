"use client";

import { useState, useEffect, useRef } from "react";
import { format, subDays } from "date-fns";
import { uk } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { PeriodSelector, getPeriodFromDate, type Period } from "@/components/PeriodSelector";
import type {
  AIReport,
  Skill,
  DailyLog,
  DeepWorkSession,
  WorkoutSession,
  BodyMeasurement,
  Transaction,
  ExpenseCategory,
} from "@/lib/types";
import {
  BarChart, Bar, Cell,
  LineChart, Line,
  PieChart, Pie,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type Tab = "overview" | "body" | "focus" | "finance" | "ai";
type FinanceView = "expenses" | "income";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Огляд" },
  { value: "body", label: "Тіло" },
  { value: "focus", label: "Фокус" },
  { value: "finance", label: "Фінанси" },
  { value: "ai", label: "AI Звіт" },
];

const BODY_FIELDS: { key: keyof BodyMeasurement; label: string; unit: string; color: string }[] = [
  { key: "weight_kg", label: "Вага", unit: "кг", color: "#00FF85" },
  { key: "waist_cm", label: "Талія", unit: "см", color: "#f59e0b" },
  { key: "chest_cm", label: "Груди", unit: "см", color: "#3b82f6" },
  { key: "shoulders_cm", label: "Плечі", unit: "см", color: "#8b5cf6" },
  { key: "bicep_cm", label: "Біцепс", unit: "см", color: "#ef4444" },
  { key: "legs_cm", label: "Ноги", unit: "см", color: "#f97316" },
];

const PIE_COLORS = ["#00FF85", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#f97316", "#6b7280"];

interface ExerciseProgress {
  exercise_id: string;
  name: string;
  history: { date: string; maxWeight: number }[];
  pr: number;
  delta: number;
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("30d");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [deepWork, setDeepWork] = useState<DeepWorkSession[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [aiReports, setAiReports] = useState<AIReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [drilldownCat, setDrilldownCat] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [financeView, setFinanceView] = useState<FinanceView>("expenses");
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([]);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const supabase = createClient();

  useEffect(() => { load(); }, [period]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fromDate = getPeriodFromDate(period);

    const [
      { data: sk }, { data: dw }, { data: wo }, { data: lg },
      { data: bm }, { data: tx }, { data: cat }, { data: reps },
    ] = await Promise.all([
      supabase.from("skills").select("*, habits(*)").eq("user_id", user.id).eq("is_active", true),
      supabase.from("deep_work_sessions").select("*").eq("user_id", user.id).gte("date", fromDate),
      supabase.from("workout_sessions").select("*").eq("user_id", user.id).gte("date", fromDate).order("date"),
      supabase.from("daily_logs").select("*").eq("user_id", user.id).gte("date", fromDate),
      supabase.from("body_measurements").select("*").eq("user_id", user.id).gte("date", fromDate).order("date"),
      supabase.from("transactions").select("*, account:finance_accounts(*), category:expense_categories(*), subcategory:expense_categories!subcategory_id(id,name)").eq("user_id", user.id).gte("date", fromDate).order("date", { ascending: false }),
      supabase.from("expense_categories").select("*").eq("user_id", user.id).is("parent_id", null),
      supabase.from("ai_reports").select("*").eq("user_id", user.id).order("week_start", { ascending: false }).limit(12),
    ]);

    setSkills(sk ?? []);
    setDeepWork(dw ?? []);
    setWorkouts(wo ?? []);
    setLogs(lg ?? []);
    setBodyMeasurements(bm ?? []);
    setTransactions(tx ?? []);
    setCategories(cat ?? []);
    setAiReports(reps ?? []);

    // Exercise progress for body tab
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight_kg, exercises(name), workout_sessions!inner(date, user_id)")
      .eq("workout_sessions.user_id", user.id)
      .gte("workout_sessions.date", fromDate)
      .gt("weight_kg", 0);

    if (sets && sets.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouped: Record<string, { name: string; byDate: Record<string, number[]> }> = {};
      for (const s of sets as any[]) {
        const id = s.exercise_id;
        const date = s.workout_sessions?.date ?? "";
        const w = s.weight_kg ?? 0;
        if (!grouped[id]) grouped[id] = { name: s.exercises?.name ?? id, byDate: {} };
        if (!grouped[id].byDate[date]) grouped[id].byDate[date] = [];
        grouped[id].byDate[date].push(w);
      }
      const progress: ExerciseProgress[] = Object.entries(grouped).map(([id, g]) => {
        const history = Object.entries(g.byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, weights]) => ({ date, maxWeight: Math.max(...weights) }));
        const allW = history.map((h) => h.maxWeight);
        return {
          exercise_id: id,
          name: g.name,
          history,
          pr: Math.max(...allW),
          delta: allW.length >= 2 ? allW[allW.length - 1] - allW[0] : 0,
        };
      }).filter((e) => e.history.length >= 2);
      setExerciseProgress(progress);
    } else {
      setExerciseProgress([]);
    }

    // Realtime subscription for finance changes
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
    }
    const ch = supabase
      .channel("analytics-finance")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    realtimeRef.current = ch;
  }

  // Cleanup realtime on unmount
  useEffect(() => () => { if (realtimeRef.current) supabase.removeChannel(realtimeRef.current); }, []);

  const totalDeepWork = deepWork.reduce((s, d) => s + d.duration_minutes, 0);

  const dwChartData = (() => {
    // Show up to 30 bars — one per day in the period
    const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : period === "180d" ? 180 : 30;
    const days = Math.min(periodDays, 30);
    return Array.from({ length: days }, (_, i) => {
      const d = subDays(new Date(), days - 1 - i);
      const dateStr = format(d, "yyyy-MM-dd");
      const mins = deepWork.filter((s) => s.date === dateStr).reduce((a, s) => a + s.duration_minutes, 0);
      return { day: format(d, "d"), hours: Math.round((mins / 60) * 10) / 10 };
    });
  })();

  const nextMonday = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 1 ? 7 : (8 - day) % 7;
    d.setDate(d.getDate() + diff);
    d.setHours(8, 0, 0, 0);
    return d;
  })();

  const countdown = (() => {
    const diff = nextMonday.getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}год ${m}хв`;
  })();

  const currentReport = aiReports[0];

  // Finance tab
  const allExpenses = transactions.filter((t) => t.amount < 0);
  const allIncome = transactions.filter((t) => t.amount > 0);
  const activeTxs = financeView === "expenses" ? allExpenses : allIncome;
  const catBreakdown = Object.values(
    activeTxs.reduce((acc, t) => {
      const key = t.category_id ?? "none";
      if (!acc[key]) acc[key] = { id: key, name: t.category?.name ?? "Без категорії", icon: t.category?.icon ?? "💡", total: 0, items: [] };
      acc[key].total += Math.abs(t.amount_eur ?? t.amount);
      acc[key].items.push(t);
      return acc;
    }, {} as Record<string, { id: string; name: string; icon: string; total: number; items: Transaction[] }>)
  ).sort((a, b) => b.total - a.total);

  const pieData = catBreakdown.map((c) => ({ name: c.name, value: Math.round(c.total) }));

  const totalExpenses = allExpenses.reduce((s, t) => s + Math.abs(t.amount_eur ?? t.amount), 0);
  const totalIncome = allIncome.reduce((s, t) => s + (t.amount_eur ?? t.amount), 0);
  const activeTotal = financeView === "expenses" ? totalExpenses : totalIncome;

  // Workout frequency bar chart
  const workoutChartData = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const count = workouts.filter((w) => w.date === dateStr).length;
    return { day: format(d, "d"), count };
  });
  const totalWorkouts30d = workouts.length;

  // alias for drilldown
  const expenses = allExpenses;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe pb-4">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-black text-white">📊 Аналітика</h1>
      </header>

      {/* Sub-tab bar */}
      <div className="flex gap-1 px-4 overflow-x-auto scrollbar-hide pb-1 mb-3">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all",
              tab === value
                ? "bg-[#00FF85] text-black"
                : "bg-[#111111] text-[#6b7280]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Period selector — all tabs except AI */}
      {tab !== "ai" && (
        <div className="px-4 mb-4">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      )}

      {/* ── ОГЛЯД ── */}
      {tab === "overview" && (
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-[#6b7280] text-xs mb-1">⚡ Deep Work</p>
              <p className="text-white font-black text-xl">
                {Math.floor(totalDeepWork / 60)}год {totalDeepWork % 60}хв
              </p>
            </div>
            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-[#6b7280] text-xs mb-1">💪 Тренувань</p>
              <p className="text-white font-black text-xl">{workouts.length}</p>
            </div>
          </div>

          <div className="bg-[#111111] rounded-2xl p-4">
            <p className="text-white font-semibold mb-3 text-sm">Deep Work по днях</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dwChartData}>
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "none", borderRadius: "12px", color: "white", fontSize: 12 }} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {dwChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.hours > 0 ? "#00FF85" : "#1a1a1a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111111] rounded-2xl p-4">
            <p className="text-white font-semibold mb-3 text-sm">Прогрес по скілах</p>
            {skills.length === 0 ? (
              <p className="text-[#6b7280] text-sm text-center py-3">Немає скілів</p>
            ) : (
              <div className="space-y-3">
                {skills.map((skill) => {
                  const skillHabits = (skill.habits ?? []).filter((h: { is_active: boolean }) => h.is_active);
                  const completed = logs.filter((l) =>
                    skillHabits.some((h: { id: string }) => h.id === l.habit_id) && l.completed
                  ).length;
                  const total = skillHabits.length * 7;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={skill.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm">{skill.icon} {skill.name}</span>
                        <span className="text-[#00FF85] text-sm font-bold">{pct}%</span>
                      </div>
                      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00FF85] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ТІЛО ── */}
      {tab === "body" && (
        <div className="px-4 space-y-4">
          {/* Workout frequency */}
          <div className="bg-[#111111] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">💪 Тренування (30д)</p>
              <p className="text-[#00FF85] font-black">{totalWorkouts30d}</p>
            </div>
            {totalWorkouts30d > 0 ? (
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={workoutChartData} barSize={4}>
                  <XAxis dataKey="day" tick={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1a", border: "none", borderRadius: "12px", color: "white", fontSize: 12 }}
                    formatter={(v) => [v, "Тренувань"]}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {workoutChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.count > 0 ? "#00FF85" : "#1a1a1a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[#6b7280] text-sm text-center py-2">Немає тренувань за 30 днів</p>
            )}
          </div>

          {/* Exercise progress */}
          {exerciseProgress.length > 0 && (
            <div className="space-y-3">
              <p className="text-[#6b7280] text-xs uppercase tracking-wider">Прогрес у вправах</p>
              {exerciseProgress.map((ex) => (
                <div key={ex.exercise_id} className="bg-[#111111] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold text-sm">{ex.name}</p>
                    <span className="text-xs bg-[#00FF85]/10 text-[#00FF85] px-2 py-0.5 rounded-full">
                      🏆 МР: {ex.pr}кг
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={ex.history}>
                      <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false}
                        tickFormatter={(d) => d.slice(5).replace("-", ".")} />
                      <YAxis domain={["auto", "auto"]} tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} unit="к" width={30} />
                      <Tooltip contentStyle={{ background: "#111", border: "none", borderRadius: 8, fontSize: 12, color: "white" }}
                        formatter={(v) => [`${v} кг`]} />
                      <Line type="monotone" dataKey="maxWeight" stroke="#00FF85" strokeWidth={2} dot={{ fill: "#00FF85", r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  {ex.delta !== 0 && (
                    <p className={`text-xs mt-1 ${ex.delta > 0 ? "text-[#00FF85]" : "text-[#ef4444]"}`}>
                      {ex.delta > 0 ? "↑" : "↓"} {Math.abs(ex.delta).toFixed(1)}кг за період
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {bodyMeasurements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📏</p>
              <p className="text-[#6b7280] text-sm">Немає вимірів за вибраний період</p>
              <p className="text-[#6b7280] text-xs mt-1">Додай виміри у розділі Тіло</p>
            </div>
          ) : (
            BODY_FIELDS.map(({ key, label, unit, color }) => {
              const data = bodyMeasurements
                .filter((m) => m[key] !== null)
                .map((m) => ({
                  date: format(new Date(m.date), "d MMM", { locale: uk }),
                  value: m[key] as number,
                }));
              if (data.length < 2) return null;

              const first = data[0].value;
              const last = data[data.length - 1].value;
              const delta = last - first;

              return (
                <div key={key} className="bg-[#111111] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-semibold text-sm">{label}</p>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">{last}{unit}</p>
                      <p className={cn("text-xs", delta < 0 ? "text-[#00FF85]" : delta > 0 ? "text-[#ef4444]" : "text-[#6b7280]")}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}{unit}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={data}>
                      <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis domain={["auto", "auto"]} tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#1a1a1a", border: "none", borderRadius: "12px", color: "white", fontSize: 11 }} />
                      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })
          )}

          {/* Photo gallery */}
          {bodyMeasurements.some((m) => m.photo_url) && (
            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-white font-semibold text-sm mb-3">📸 Фотопрогрес</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {bodyMeasurements
                  .filter((m) => m.photo_url)
                  .map((m) => (
                    <div key={m.id} className="flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.photo_url!}
                        alt={m.date}
                        className="w-24 h-32 object-cover rounded-xl"
                        onClick={() => window.open(m.photo_url!, "_blank")}
                      />
                      <p className="text-[#6b7280] text-[10px] text-center mt-1">
                        {format(new Date(m.date), "d MMM", { locale: uk })}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ФОКУС ── */}
      {tab === "focus" && (
        <div className="px-4 space-y-4">
          <div className="bg-[#111111] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-semibold text-sm">⚡ Deep Work</p>
              <p className="text-[#00FF85] font-black">{Math.floor(totalDeepWork / 60)}год {totalDeepWork % 60}хв</p>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={dwChartData}>
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} unit="г" />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "none", borderRadius: "12px", color: "white", fontSize: 12 }} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {dwChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.hours > 0 ? "#00FF85" : "#1a1a1a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111111] rounded-2xl p-4">
            <p className="text-white font-semibold mb-3 text-sm">Виконання звичок по скілах</p>
            {skills.length === 0 ? (
              <p className="text-[#6b7280] text-sm text-center py-3">Немає скілів</p>
            ) : (
              <div className="space-y-4">
                {skills.map((skill) => {
                  const skillHabits = (skill.habits ?? []).filter((h: { is_active: boolean }) => h.is_active);
                  const completed = logs.filter((l) =>
                    skillHabits.some((h: { id: string }) => h.id === l.habit_id) && l.completed
                  ).length;
                  const total = skillHabits.length * 7;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={skill.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">{skill.icon} {skill.name}</span>
                        <span className={cn("text-sm font-black", pct >= 70 ? "text-[#00FF85]" : pct >= 40 ? "text-[#f59e0b]" : "text-[#ef4444]")}>{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 70 ? "#00FF85" : pct >= 40 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <div className="flex gap-1 mt-2 overflow-x-auto">
                        {skillHabits.map((h: { id: string; name: string }) => {
                          const daysCompleted = logs.filter((l) => l.habit_id === h.id && l.completed).length;
                          return (
                            <div key={h.id} className="shrink-0 text-center min-w-[40px]">
                              <p className="text-[#00FF85] text-xs font-bold">{daysCompleted}д</p>
                              <p className="text-[#6b7280] text-[9px] truncate">{h.name}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ФІНАНСИ ── */}
      {tab === "finance" && (
        <div className="px-4 space-y-4">
          {/* Income / Expense toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#1a1a1a] rounded-2xl">
            <button
              onClick={() => setFinanceView("expenses")}
              className={cn("py-2.5 rounded-xl text-sm font-semibold transition-all",
                financeView === "expenses" ? "bg-[#ef4444] text-white" : "text-[#6b7280]")}
            >
              💸 Витрати €{totalExpenses.toFixed(0)}
            </button>
            <button
              onClick={() => setFinanceView("income")}
              className={cn("py-2.5 rounded-xl text-sm font-semibold transition-all",
                financeView === "income" ? "bg-[#00FF85] text-black" : "text-[#6b7280]")}
            >
              💰 Дохід €{totalIncome.toFixed(0)}
            </button>
          </div>

          {catBreakdown.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💸</p>
              <p className="text-[#6b7280] text-sm">Немає даних за цей період</p>
            </div>
          ) : (
            <>
              <div className="bg-[#111111] rounded-2xl p-4 flex flex-col items-center">
                <p className="text-white font-semibold text-sm mb-3 self-start">
                  {financeView === "expenses" ? "Витрати" : "Дохід"} по категоріях
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#1a1a1a", border: "none", borderRadius: "12px", color: "white", fontSize: 12 }}
                      formatter={(value) => [`€${value}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#111111] rounded-2xl overflow-hidden divide-y divide-white/5">
                {catBreakdown.map((cat, i) => {
                  const pct = activeTotal > 0 ? Math.round((cat.total / activeTotal) * 100) : 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setDrilldownCat({ id: cat.id, name: cat.name, icon: cat.icon })}
                      className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors"
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-lg shrink-0">{cat.icon}</span>
                      <p className="text-white text-sm flex-1 text-left">{cat.name}</p>
                      <p className="text-[#6b7280] text-xs">{pct}%</p>
                      <p className={cn("font-semibold text-sm shrink-0", financeView === "expenses" ? "text-[#ef4444]" : "text-[#00FF85]")}>€{Math.round(cat.total)}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── AI ЗВІТ ── */}
      {tab === "ai" && (
        <div className="px-4 space-y-3">
          {/* Current week hint */}
          {!currentReport && (
            <div className="bg-[#111111] rounded-2xl p-4 text-center">
              <p className="text-[#6b7280] text-sm mb-1">Наступний звіт у понеділок о 8:00</p>
              <p className="text-white font-bold">{countdown}</p>
            </div>
          )}

          {aiReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🤖</p>
              <p className="text-[#6b7280] text-sm">Звітів ще немає</p>
              <p className="text-[#6b7280] text-xs mt-1">AI аналізує тиждень у понеділок</p>
            </div>
          ) : (
            aiReports.map((rep) => (
              <div key={rep.id} className="bg-[#111111] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedReport(expandedReport === rep.id ? null : rep.id)}
                  className="w-full flex items-center justify-between px-4 py-4"
                >
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">
                      🤖 Тиждень з {format(new Date(rep.week_start), "d MMM", { locale: uk })}
                    </p>
                    <p className="text-[#6b7280] text-xs mt-0.5">
                      {rep.generated_at
                        ? format(new Date(rep.generated_at), "d MMM HH:mm", { locale: uk })
                        : "Не згенеровано"}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn("text-[#6b7280] transition-transform", expandedReport === rep.id && "rotate-180")}
                  />
                </button>

                {expandedReport === rep.id && rep.report_json && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    <div>
                      <p className="text-[#00FF85] font-semibold text-xs mb-1">✅ Що добре</p>
                      {rep.report_json.good.map((item, i) => (
                        <p key={i} className="text-white/80 text-xs leading-relaxed">• {item}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[#f59e0b] font-semibold text-xs mb-1">⚠️ Що покращити</p>
                      {rep.report_json.improve.map((item, i) => (
                        <p key={i} className="text-white/80 text-xs leading-relaxed">• {item}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-xs mb-1">🎯 Фокус тижня</p>
                      <p className="text-white/80 text-xs leading-relaxed">{rep.report_json.focus}</p>
                    </div>
                  </div>
                )}

                {expandedReport === rep.id && !rep.report_json && (
                  <div className="px-4 pb-4 text-center">
                    <p className="text-[#6b7280] text-sm">Звіт не було згенеровано</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Category Drill-Down ── */}
      <BottomSheet open={!!drilldownCat} onClose={() => setDrilldownCat(null)} title={drilldownCat?.name ?? ""}>
        {drilldownCat && (() => {
          const entry = catBreakdown.find((c) => c.id === drilldownCat.id) ?? { items: [], total: 0 };
          const drillTxs = entry.items;
          const drillTotal = entry.total;
          const color = financeView === "expenses" ? "#ef4444" : "#00FF85";
          return (
            <div className="space-y-3 pb-6">
              <div className="text-center py-2">
                <span className="text-5xl">{drilldownCat.icon}</span>
                <p className="font-black text-3xl mt-3" style={{ color }}>€{Math.round(drillTotal)}</p>
                <p className="text-[#6b7280] text-xs mt-1">{drillTxs.length} транзакцій</p>
              </div>
              <div className="space-y-2">
                {drillTxs.map((tx) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const sub = (tx as any).subcategory as { name: string } | null;
                  const label = sub ? `${drilldownCat.name} / ${sub.name}` : drilldownCat.name;
                  const pct = drillTotal > 0 ? Math.round((Math.abs(tx.amount_eur ?? tx.amount) / drillTotal) * 100) : 0;
                  return (
                    <div key={tx.id} className="bg-[#1a1a1a] rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-white text-sm">{label}</p>
                        <p className="font-semibold text-sm" style={{ color }}>€{Math.abs(tx.amount_eur ?? tx.amount).toFixed(0)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <p className="text-[#6b7280] text-xs w-8 text-right">{pct}%</p>
                      </div>
                      <p className="text-[#6b7280] text-xs mt-1">
                        {new Date(tx.date).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })} · {tx.account?.name}
                      </p>
                    </div>
                  );
                })}
                {drillTxs.length === 0 && (
                  <p className="text-[#6b7280] text-sm text-center py-4">Немає транзакцій</p>
                )}
              </div>
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
}
