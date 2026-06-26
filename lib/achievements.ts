import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/Toaster";
import { getLevelInfo } from "@/lib/xp";

export const ALL_ACHIEVEMENTS = [
  { key: "streak_3",          name: "Перші кроки",         icon: "👣", description: "3 дні підряд",                    xp_reward: 50,    rarity: "common" },
  { key: "streak_7",          name: "Тижневик",             icon: "🔥", description: "7 днів підряд",                   xp_reward: 200,   rarity: "common" },
  { key: "streak_14",         name: "Дві тижні вогню",      icon: "🔥", description: "14 днів підряд",                  xp_reward: 400,   rarity: "rare" },
  { key: "streak_30",         name: "Місяць без зупинки",   icon: "⚡", description: "30 днів підряд",                  xp_reward: 1000,  rarity: "rare" },
  { key: "streak_60",         name: "Два місяці",           icon: "💎", description: "60 днів підряд",                  xp_reward: 2000,  rarity: "epic" },
  { key: "streak_90",         name: "Квартал",              icon: "👑", description: "90 днів підряд",                  xp_reward: 5000,  rarity: "epic" },
  { key: "streak_180",        name: "Сезон завершено",      icon: "🏆", description: "180 днів підряд",                 xp_reward: 15000, rarity: "legendary" },
  { key: "first_workout",     name: "Перше тренування",     icon: "🏋️", description: "Записав перше тренування",        xp_reward: 100,   rarity: "common" },
  { key: "workouts_10",       name: "Регуляр",              icon: "💪", description: "10 тренувань",                    xp_reward: 300,   rarity: "common" },
  { key: "workouts_30",       name: "Залізна людина",       icon: "🦾", description: "30 тренувань",                    xp_reward: 800,   rarity: "rare" },
  { key: "workouts_60",       name: "Атлет",                icon: "🥇", description: "60 тренувань",                    xp_reward: 2000,  rarity: "epic" },
  { key: "first_pr",          name: "Новий рекорд",         icon: "📈", description: "Перший особистий рекорд",         xp_reward: 150,   rarity: "common" },
  { key: "pr_5",              name: "Машина прогресу",      icon: "🚀", description: "5 особистих рекордів",            xp_reward: 500,   rarity: "rare" },
  { key: "pr_20",             name: "Незупинний",           icon: "⚡", description: "20 особистих рекордів",           xp_reward: 1500,  rarity: "epic" },
  { key: "deepwork_first",    name: "Перша сесія",          icon: "🎯", description: "Перша Deep Work сесія",           xp_reward: 50,    rarity: "common" },
  { key: "deepwork_10h",      name: "10 годин фокусу",      icon: "⏱️", description: "10 год Deep Work всього",         xp_reward: 200,   rarity: "common" },
  { key: "deepwork_50h",      name: "Глибокий занурювач",   icon: "🌊", description: "50 год Deep Work всього",         xp_reward: 500,   rarity: "rare" },
  { key: "deepwork_200h",     name: "Майстер фокусу",       icon: "🧘", description: "200 год Deep Work всього",        xp_reward: 2000,  rarity: "epic" },
  { key: "deepwork_5h_day",   name: "Монах за день",        icon: "🔮", description: "5+ год Deep Work за день",        xp_reward: 300,   rarity: "rare" },
  { key: "first_transaction", name: "Перша витрата",        icon: "💰", description: "Записав першу транзакцію",        xp_reward: 30,    rarity: "common" },
  { key: "transactions_30",   name: "Фінансист",            icon: "📊", description: "30 транзакцій записано",          xp_reward: 200,   rarity: "common" },
  { key: "transactions_100",  name: "Бухгалтер",            icon: "🧾", description: "100 транзакцій",                  xp_reward: 600,   rarity: "rare" },
  { key: "first_saving",      name: "Перші заощадження",    icon: "🏦", description: "Відклав гроші вперше",            xp_reward: 100,   rarity: "common" },
  { key: "first_measurement", name: "Перший замір",         icon: "📏", description: "Вніс перші заміри тіла",          xp_reward: 75,    rarity: "common" },
  { key: "measurements_4",    name: "Місячний огляд",       icon: "🪞", description: "4 тижні замірів підряд",          xp_reward: 300,   rarity: "rare" },
  { key: "measurements_12",   name: "Трекер форми",         icon: "📸", description: "12 тижнів замірів підряд",        xp_reward: 1000,  rarity: "epic" },
  { key: "first_note",        name: "Перша думка",          icon: "📝", description: "Написав першу нотатку",           xp_reward: 20,    rarity: "common" },
  { key: "notes_10",          name: "Мислитель",            icon: "💭", description: "10 нотаток",                      xp_reward: 100,   rarity: "common" },
  { key: "notes_50",          name: "Філософ",              icon: "🧠", description: "50 нотаток",                      xp_reward: 400,   rarity: "rare" },
  { key: "first_voice",       name: "Голосовий щоденник",   icon: "🎙️", description: "Перший голосовий запис",          xp_reward: 50,    rarity: "common" },
  { key: "perfect_day",       name: "Ідеальний день",       icon: "✨", description: "Всі звички виконані за день",     xp_reward: 150,   rarity: "common" },
  { key: "perfect_week",      name: "Ідеальний тиждень",    icon: "🌟", description: "Ідеальний день 7 разів",          xp_reward: 500,   rarity: "rare" },
  { key: "perfect_month",     name: "Ідеальний місяць",     icon: "💫", description: "Ідеальний день 30 разів",         xp_reward: 2000,  rarity: "epic" },
  { key: "night_owl",         name: "Рання пташка",         icon: "🌅", description: "Ліг до 23:00 — 14 разів",        xp_reward: 300,   rarity: "rare" },
  { key: "no_phone",          name: "Цифровий детокс",      icon: "📵", description: "Обмежив екран 14 разів",          xp_reward: 300,   rarity: "rare" },
  { key: "social_hero",       name: "Соціальний герой",     icon: "🤝", description: "20 соціальних взаємодій",         xp_reward: 400,   rarity: "rare" },
  { key: "level_10",          name: "Топ 10",               icon: "🎖️", description: "Досяг 10 рівня",                 xp_reward: 0,     rarity: "epic" },
  { key: "level_20",          name: "Легенда сезону",       icon: "👑", description: "Досяг 20 рівня",                 xp_reward: 0,     rarity: "legendary" },
  { key: "all_skills",        name: "Поліфат",              icon: "🌈", description: "Виконав всі скіли за тиждень",   xp_reward: 500,   rarity: "rare" },
  { key: "comeback",          name: "Камбек",               icon: "⚡", description: "Відновив стрік після паузи",     xp_reward: 200,   rarity: "rare" },
] as const;

export type AchievementKey = typeof ALL_ACHIEVEMENTS[number]["key"];

export async function awardXP(userId: string, amount: number, reason: string): Promise<number> {
  const supabase = createClient();

  await supabase.from("xp_events").insert({ user_id: userId, amount, reason });

  const { data: prof } = await supabase
    .from("profiles")
    .select("total_xp, current_level")
    .eq("id", userId)
    .single();

  const oldXp = prof?.total_xp ?? 0;
  const oldLevel = prof?.current_level ?? 1;
  const newXp = oldXp + amount;
  const { level, name } = getLevelInfo(newXp);

  await supabase.from("profiles").update({
    total_xp: newXp,
    current_level: level,
    level_name: name,
  }).eq("id", userId);

  return level > oldLevel ? level : 0;
}

export async function unlockAchievement(userId: string, key: AchievementKey): Promise<boolean> {
  const supabase = createClient();
  const achievement = ALL_ACHIEVEMENTS.find((a) => a.key === key);
  if (!achievement) return false;

  const { error } = await supabase.from("user_achievements").insert({
    user_id: userId,
    achievement_key: key,
  });

  if (error) return false; // already unlocked (unique constraint)

  showToast(`${achievement.icon} ${achievement.name} — +${achievement.xp_reward} XP`);

  if (achievement.xp_reward > 0) {
    await awardXP(userId, achievement.xp_reward, `achievement:${key}`);
  }

  return true;
}

export async function checkAllHabitsDoneToday(userId: string): Promise<boolean> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: habits } = await supabase.from("habits").select("id").eq("user_id", userId).eq("is_active", true);
  if (!habits || habits.length === 0) return false;
  const { data: logs } = await supabase.from("daily_logs").select("habit_id").eq("user_id", userId).eq("date", today).eq("completed", true);
  const doneIds = new Set((logs ?? []).map((l) => l.habit_id));
  return habits.every((h) => doneIds.has(h.id));
}

export async function checkHabitAchievements(userId: string, streak: number) {
  if (streak >= 3)   await unlockAchievement(userId, "streak_3");
  if (streak >= 7)   await unlockAchievement(userId, "streak_7");
  if (streak >= 14)  await unlockAchievement(userId, "streak_14");
  if (streak >= 30)  await unlockAchievement(userId, "streak_30");
  if (streak >= 60)  await unlockAchievement(userId, "streak_60");
  if (streak >= 90)  await unlockAchievement(userId, "streak_90");
  if (streak >= 180) await unlockAchievement(userId, "streak_180");
}

export async function checkWorkoutAchievements(userId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = count ?? 0;
  if (total >= 1)  await unlockAchievement(userId, "first_workout");
  if (total >= 10) await unlockAchievement(userId, "workouts_10");
  if (total >= 30) await unlockAchievement(userId, "workouts_30");
  if (total >= 60) await unlockAchievement(userId, "workouts_60");
}

export async function checkDeepWorkAchievements(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("deep_work_sessions")
    .select("duration_minutes, date")
    .eq("user_id", userId);

  const totalMins = (data ?? []).reduce((s, d) => s + d.duration_minutes, 0);
  const totalHours = totalMins / 60;

  if (data && data.length >= 1) await unlockAchievement(userId, "deepwork_first");
  if (totalHours >= 10)  await unlockAchievement(userId, "deepwork_10h");
  if (totalHours >= 50)  await unlockAchievement(userId, "deepwork_50h");
  if (totalHours >= 200) await unlockAchievement(userId, "deepwork_200h");

  // Check today's hours
  const today = new Date().toISOString().slice(0, 10);
  const todayMins = (data ?? [])
    .filter((d) => d.date === today)
    .reduce((s, d) => s + d.duration_minutes, 0);
  if (todayMins >= 300) await unlockAchievement(userId, "deepwork_5h_day");
}

export async function checkTransactionAchievements(userId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = count ?? 0;
  if (total >= 1)   await unlockAchievement(userId, "first_transaction");
  if (total >= 30)  await unlockAchievement(userId, "transactions_30");
  if (total >= 100) await unlockAchievement(userId, "transactions_100");
}

export async function checkNoteAchievements(userId: string, isVoice = false) {
  const supabase = createClient();
  const { count } = await supabase
    .from("notes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = count ?? 0;
  if (total >= 1)  await unlockAchievement(userId, "first_note");
  if (total >= 10) await unlockAchievement(userId, "notes_10");
  if (total >= 50) await unlockAchievement(userId, "notes_50");
  if (isVoice)     await unlockAchievement(userId, "first_voice");
}

export async function checkMeasurementAchievements(userId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from("body_measurements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= 1) await unlockAchievement(userId, "first_measurement");
}

export async function checkLevelAchievements(userId: string, level: number) {
  if (level >= 10) await unlockAchievement(userId, "level_10");
  if (level >= 20) await unlockAchievement(userId, "level_20");
}
