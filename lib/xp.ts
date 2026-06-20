export const XP_REWARDS = {
  HABIT_COMPLETED: 10,
  ALL_HABITS_DAY: 100,
  WORKOUT_LOGGED: 50,
  WORKOUT_PR: 150,
  MEASUREMENTS_LOGGED: 75,
  STREAK_7_DAYS: 200,
  STREAK_30_DAYS: 500,
  STREAK_90_DAYS: 1500,
  NOTE_ADDED: 15,
  FINANCE_TRANSACTION: 5,
  DEEP_WORK_1H: 30,
  NUTRITION_DONE: 40,
  WEEK_PERFECT: 300,
} as const;

export const LEVELS = [
  { level: 1,  xp: 0,      name: "Новачок" },
  { level: 2,  xp: 500,    name: "Початківець" },
  { level: 3,  xp: 1200,   name: "Практик" },
  { level: 4,  xp: 2500,   name: "Дисциплінований" },
  { level: 5,  xp: 4500,   name: "Стійкий" },
  { level: 6,  xp: 7000,   name: "Фокусований" },
  { level: 7,  xp: 10000,  name: "Цілеспрямований" },
  { level: 8,  xp: 14000,  name: "Непохитний" },
  { level: 9,  xp: 19000,  name: "Воїн" },
  { level: 10, xp: 25000,  name: "Елітний" },
  { level: 11, xp: 32000,  name: "Майстер" },
  { level: 12, xp: 40000,  name: "Легенда" },
  { level: 13, xp: 50000,  name: "Хижак" },
  { level: 14, xp: 62000,  name: "Нелюдина" },
  { level: 15, xp: 76000,  name: "Аскет" },
  { level: 16, xp: 92000,  name: "Залізна воля" },
  { level: 17, xp: 110000, name: "Без компромісів" },
  { level: 18, xp: 130000, name: "Надлюдина" },
  { level: 19, xp: 155000, name: "Монах" },
  { level: 20, xp: 185000, name: "Легенда Сезону" },
];

export function getLevelInfo(totalXp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? LEVELS[LEVELS.length - 1];
    } else {
      break;
    }
  }
  const xpInLevel = totalXp - current.xp;
  const xpForNext = next.xp - current.xp;
  const progress = current.level >= LEVELS.length ? 100 : Math.round((xpInLevel / xpForNext) * 100);
  return { level: current.level, name: current.name, xpInLevel, xpForNext, progress };
}
