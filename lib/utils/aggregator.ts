import type {
  DeepWorkSession,
  Skill,
  DailyLog,
  WorkoutSession,
  NutritionLog,
  BodyMeasurement,
  Transaction,
  Note,
} from "@/lib/types";
import { format, subDays, eachDayOfInterval } from "date-fns";

export interface WeeklyData {
  deepWorkHours: number;
  dailyDeepWork: Record<string, number>;
  habitsSummary: string;
  workoutSummary: string;
  nutritionSummary: string;
  measurementsDelta: string;
  financeSummary: string;
  notesSummary: string;
}

export function aggregateWeeklyData(
  sessions: DeepWorkSession[],
  skills: Skill[],
  logs: DailyLog[],
  workouts: WorkoutSession[],
  nutrition: NutritionLog[],
  measurements: BodyMeasurement[],
  transactions: Transaction[],
  notes: Note[],
  weekStart: Date,
  weekEnd: Date
): WeeklyData {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Deep work
  const totalMinutes = sessions.reduce((s, r) => s + r.duration_minutes, 0);
  const deepWorkHours = Math.round(totalMinutes / 60 * 10) / 10;

  const dailyDeepWork: Record<string, number> = {};
  days.forEach((d) => {
    const key = format(d, "yyyy-MM-dd");
    const mins = sessions
      .filter((s) => s.date === key)
      .reduce((a, s) => a + s.duration_minutes, 0);
    dailyDeepWork[key] = Math.round(mins / 60 * 10) / 10;
  });

  // Habits
  const habitLines: string[] = [];
  for (const skill of skills) {
    if (!skill.habits?.length) continue;
    const activeHabits = skill.habits.filter((h) => h.is_active);
    if (!activeHabits.length) continue;
    const completed = logs.filter(
      (l) => activeHabits.some((h) => h.id === l.habit_id) && l.completed
    ).length;
    const total = activeHabits.length * days.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    habitLines.push(`${skill.icon} ${skill.name}: ${pct}%`);
  }

  // Workouts
  const workoutSummary = workouts.length > 0
    ? `${workouts.length} тренувань`
    : "0 тренувань";

  // Nutrition
  const doneNutrition = nutrition.filter((n) => n.status === "done").length;
  const cheatNutrition = nutrition.filter((n) => n.status === "cheat").length;
  const nutritionSummary = `${doneNutrition}/${days.length} днів норму виконано, ${cheatNutrition} зривів`;

  // Measurements delta
  let measurementsDelta = "Немає нових замірів";
  if (measurements.length >= 2) {
    const latest = measurements[0];
    const prev = measurements[1];
    const weightDelta = latest.weight_kg && prev.weight_kg
      ? (latest.weight_kg - prev.weight_kg).toFixed(1)
      : null;
    measurementsDelta = weightDelta
      ? `Вага: ${weightDelta > "0" ? "+" : ""}${weightDelta}кг`
      : "Заміри без вагових даних";
  }

  // Finance
  const totalSpent = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount_eur ?? 0), 0);
  const financeSummary = `Витрачено €${totalSpent.toFixed(0)}`;

  // Notes summary
  const notesSummary = notes.length > 0
    ? notes.map((n) => `[${n.type}] ${n.content.slice(0, 200)}`).join("\n")
    : "Без нотаток";

  return {
    deepWorkHours,
    dailyDeepWork,
    habitsSummary: habitLines.join(", ") || "Немає даних",
    workoutSummary,
    nutritionSummary,
    measurementsDelta,
    financeSummary,
    notesSummary,
  };
}

export function buildGrokPrompt(data: WeeklyData, pointB: Record<string, string>): string {
  const dailyStr = Object.entries(data.dailyDeepWork)
    .map(([d, h]) => `${d}: ${h}год`)
    .join(", ");

  return `You are a personal life coach analyzing a week of data for someone doing a 6-month Monk Mode challenge.

Their goals (Point B):
${Object.entries(pointB).map(([k, v]) => `${k}: ${v}`).join("\n")}

This week's data:
- Deep Work: ${data.deepWorkHours}год всього (${dailyStr})
- Habit completion: ${data.habitsSummary}
- Workouts: ${data.workoutSummary}
- Nutrition: ${data.nutritionSummary}
- Body measurements change: ${data.measurementsDelta}
- Money spent: ${data.financeSummary}
- Their notes this week: ${data.notesSummary}

Write a concise weekly report in Ukrainian with exactly 3 sections:
1. ✅ ЩО ДОБРЕ (2-3 bullet points of genuine wins)
2. ⚠️ ЩО ПОКРАЩИТИ (2-3 specific actionable suggestions)
3. 🎯 ФОКУС НА ЦЕЙ ТИЖДЕНЬ (1 main focus, max 2 sentences)

Be direct, honest, motivating. Reference their specific data. No generic advice.`;
}
