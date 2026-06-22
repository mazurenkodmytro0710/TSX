export interface Profile {
  id: string;
  name: string | null;
  goal_start_date: string | null;
  goal_end_date: string | null;
  point_a: { body: string; money: string; social: string; skills: string } | null;
  point_b: { body: string; money: string; social: string; skills: string } | null;
  month_one_plan: string | null;
  daily_reminder_time: string;
  sleep_target_time: string;
  calorie_goal: number;
  protein_goal: number;
  base_currency: string;
  streak_freeze_used_this_month: boolean;
  grok_api_key: string | null;
  streak: number;
  total_xp: number;
  current_level: number;
  level_name: string;
  created_at: string;
}

export interface Season {
  id: string;
  user_id: string;
  number: number;
  name: string;
  start_date: string;
  end_date: string;
  point_a: { body: string; money: string; social: string; skills: string } | null;
  point_b: { body: string; money: string; social: string; skills: string } | null;
  month_one_plan: string | null;
  status: "active" | "completed" | "archived";
  final_reflection: string | null;
  created_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  category: "body" | "focus" | "social" | "finance" | "custom";
  sort_order: number;
  is_active: boolean;
  season_id: string | null;
  created_at: string;
  habits?: Habit[];
}

export interface Habit {
  id: string;
  user_id: string;
  skill_id: string;
  name: string;
  type: "checkbox" | "note" | "counter" | "duration";
  sort_order: number;
  is_active: boolean;
  created_at: string;
  log?: DailyLog;
}

export interface DailyLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  note: string | null;
  value: number | null;
  created_at: string;
}

export interface DeepWorkSession {
  id: string;
  user_id: string;
  date: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number;
  note: string | null;
  season_id: string | null;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  date: string;
  status: "done" | "underate" | "cheat" | null;
  calories_actual: number | null;
  protein_actual: number | null;
  note: string | null;
  season_id: string | null;
  created_at: string;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  season_id: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
  is_custom: boolean;
  created_at: string;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  sort_order: number;
  starting_weight_kg: number;
  sets_target: number;
  exercise?: Exercise;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  template_id: string | null;
  date: string;
  started_at: string | null;
  ended_at: string | null;
  note: string | null;
  season_id: string | null;
  created_at: string;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  created_at: string;
  exercise?: Exercise;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  shoulders_cm: number | null;
  bicep_cm: number | null;
  legs_cm: number | null;
  note: string | null;
  photo_url: string | null;
  season_id: string | null;
  created_at: string;
}

export interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  currency: "UAH" | "EUR" | "USD";
  icon: string;
  current_balance: number;
  is_savings: boolean;
  include_in_total: boolean;
  sort_order: number;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  created_at: string;
  subcategories?: ExpenseCategory[];
}

export interface ExpenseGroup {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  subcategory_id?: string | null;
  group_id: string | null;
  amount: number;
  currency: string;
  amount_eur: number | null;
  description: string | null;
  date: string;
  season_id: string | null;
  created_at: string;
  account?: FinanceAccount;
  category?: ExpenseCategory;
  subcategory?: ExpenseCategory;
  group?: ExpenseGroup;
}

export interface Note {
  id: string;
  user_id: string;
  type: "thought" | "reflection" | "insight";
  content: string;
  audio_url: string | null;
  linked_skill_id: string | null;
  date: string;
  season_id: string | null;
  created_at: string;
  skill?: Skill;
}

export interface AIReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  report_json: {
    good: string[];
    improve: string[];
    focus: string;
    raw: string;
  } | null;
  generated_at: string | null;
  season_id: string | null;
  created_at: string;
}

export interface ProgressSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  month_number: number;
  data: Record<string, unknown>;
  season_id: string | null;
  created_at: string;
}

export interface CurrencyRates {
  eurUah: number;
  usdUah: number;
  usdEur: number;
  updatedAt: string;
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
  achievement?: Achievement;
}
