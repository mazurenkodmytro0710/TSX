"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subDays } from "date-fns";
import { uk } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [weekOffset, setWeekOffset] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [deepWork, setDeepWork] = useState<DeepWorkSession[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [aiReports, setAiReports] = useState<AIReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const supabase = createClient();

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "d MMM", { locale: uk })} – ${format(weekEnd, "d MMM", { locale: uk })}`;

  useEffect(() => { load(); }, [weekOffset]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const start = format(weekStart, "yyyy-MM-dd");
    const end = format(weekEnd, "yyyy-MM-dd");
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

    const [
      { data: sk }, { data: dw }, { data: wo }, { data: lg },
      { data: bm }, { data: tx }, { data: cat }, { data: reps },
    ] = await Promise.all([
      supabase.from("skills").select("*, habits(*)").eq("user_id", user.id).eq("is_active", true),
      supabase.from("deep_work_sessions").select("*").eq("user_id", user.id).gte("date", start).lte("date", end),
      supabase.from("workout_sessions").select("*").eq("user_id", user.id).gte("date", start).lte("date", end),
      supabase.from("daily_logs").select("*").eq("user_id", user.id).gte("date", start).lte("date", end),
      supabase.from("body_measurements").select("*").eq("user_id", user.id).gte("date", thirtyDaysAgo).order("date"),
      supabase.from("transactions").select("*, category:expense_categories(*)").eq("user_id", user.id).gte("date", start).lte("date", end),
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
  }

  const totalDeepWork = deepWork.reduce((s, d) => s + d.duration_minutes, 0);

  const dwChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = format(d, "yyyy-MM-dd");
    const mins = deepWork.filter((s) => s.date === dateStr).reduce((a, s) => a + s.duration_minutes, 0);
    return { day: format(d, "EEE", { locale: uk }), hours: Math.round((mins / 60) * 10) / 10 };
  });

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

  const currentReport = aiReports.find((r) => r.week_start === format(weekStart, "yyyy-MM-dd"));

  // Finance tab: spending by category (expenses only)
  const expenses = transactions.filter((t) => t.amount < 0);
  const spendingByCategory: Record<string, number> = {};
  expenses.forEach((t) => {
    const catName = t.category?.name ?? "Інше";
    spendingByCategory[catName] = (spendingByCategory[catName] ?? 0) + Math.abs(t.amount_eur ?? t.amount);
  });
  const pieData = Object.entries(spendingByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount_eur ?? t.amount), 0);
  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + (t.amount_eur ?? t.amount), 0);

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

      {/* Week selector (Overview + Focus only) */}
      {(tab === "overview" || tab === "focus") && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between bg-[#111111] rounded-2xl p-3">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="text-[#6b7280] p-2">
              <ChevronLeft size={20} />
            </button>
            <p className="text-white font-semibold text-sm">{weekLabel}</p>
            <button
              onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
              disabled={weekOffset === 0}
              className="text-[#6b7280] p-2 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
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
          {bodyMeasurements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📏</p>
              <p className="text-[#6b7280] text-sm">Немає вимірів за останні 30 днів</p>
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
              <p className="text-white font-semibold text-sm">⚡ Deep Work за тиждень</p>
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
                      <div className="flex gap-1 mt-2">
                        {skillHabits.map((h: { id: string; name: string }) => {
                          const daysCompleted = logs.filter((l) => l.habit_id === h.id && l.completed).length;
                          return (
                            <div key={h.id} className="flex-1 min-w-0 text-center">
                              <div className="flex gap-0.5 justify-center">
                                {Array.from({ length: 7 }).map((_, di) => {
                                  const d = new Date(weekStart);
                                  d.setDate(d.getDate() + di);
                                  const dateStr = format(d, "yyyy-MM-dd");
                                  const done = logs.some((l) => l.habit_id === h.id && l.date === dateStr && l.completed);
                                  return (
                                    <div key={di} className={cn("w-2 h-2 rounded-full", done ? "bg-[#00FF85]" : "bg-[#1a1a1a]")} />
                                  );
                                })}
                              </div>
                              <p className="text-[#6b7280] text-[9px] mt-0.5 truncate">{h.name}</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-[#6b7280] text-xs mb-1">💸 Витрати</p>
              <p className="text-[#ef4444] font-black text-xl">€{totalExpenses.toFixed(0)}</p>
            </div>
            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-[#6b7280] text-xs mb-1">💰 Дохід</p>
              <p className="text-[#00FF85] font-black text-xl">€{totalIncome.toFixed(0)}</p>
            </div>
          </div>

          {pieData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💸</p>
              <p className="text-[#6b7280] text-sm">Немає витрат за цей тиждень</p>
            </div>
          ) : (
            <>
              <div className="bg-[#111111] rounded-2xl p-4 flex flex-col items-center">
                <p className="text-white font-semibold text-sm mb-3 self-start">Витрати по категоріях</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
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
                {pieData.map(({ name, value }, i) => {
                  const pct = totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0;
                  const cat = categories.find((c) => c.name === name);
                  return (
                    <div key={name} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-lg shrink-0">{cat?.icon ?? "💡"}</span>
                      <p className="text-white text-sm flex-1">{name}</p>
                      <p className="text-[#6b7280] text-xs">{pct}%</p>
                      <p className="text-white font-semibold text-sm shrink-0">€{value}</p>
                    </div>
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
    </div>
  );
}
