-- T6X Supabase Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- SEASONS (6-month cycles)
create table seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  number int,
  name text,
  start_date date,
  end_date date,
  point_a jsonb,
  point_b jsonb,
  month_one_plan text,
  status text default 'active',
  final_reflection text,
  created_at timestamptz default now()
);

-- PROFILES
create table profiles (
  id uuid references auth.users primary key,
  name text,
  goal_start_date date,
  goal_end_date date,
  point_a jsonb,
  point_b jsonb,
  month_one_plan text,
  daily_reminder_time time default '20:00',
  sleep_target_time time default '23:00',
  calorie_goal int default 2800,
  protein_goal int default 180,
  base_currency text default 'EUR',
  streak_freeze_used_this_month boolean default false,
  streak int default 0,
  grok_api_key text,
  created_at timestamptz default now()
);

-- SKILLS
create table skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  icon text,
  color text,
  category text,
  sort_order int,
  is_active boolean default true,
  season_id uuid references seasons,
  created_at timestamptz default now()
);

-- HABITS
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  skill_id uuid references skills,
  name text,
  type text default 'checkbox',
  sort_order int,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- DAILY LOGS
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  habit_id uuid references habits,
  date date,
  completed boolean default false,
  note text,
  value numeric,
  created_at timestamptz default now(),
  unique(user_id, habit_id, date)
);

-- DEEP WORK SESSIONS
create table deep_work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  date date,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int,
  note text,
  season_id uuid references seasons,
  created_at timestamptz default now()
);

-- NUTRITION LOGS
create table nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  date date,
  status text,
  calories_actual int,
  protein_actual int,
  note text,
  season_id uuid references seasons,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- WORKOUT TEMPLATES
create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  sort_order int,
  season_id uuid references seasons,
  created_at timestamptz default now()
);

-- EXERCISES
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  muscle_group text,
  is_custom boolean default false,
  created_at timestamptz default now()
);

-- TEMPLATE EXERCISES
create table template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates,
  exercise_id uuid references exercises,
  sort_order int
);

-- WORKOUT SESSIONS
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  template_id uuid references workout_templates,
  date date,
  started_at timestamptz,
  ended_at timestamptz,
  note text,
  season_id uuid references seasons,
  created_at timestamptz default now()
);

-- WORKOUT SETS
create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workout_sessions,
  exercise_id uuid references exercises,
  set_number int,
  weight_kg numeric,
  reps int,
  created_at timestamptz default now()
);

-- BODY MEASUREMENTS
create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  date date,
  weight_kg numeric,
  waist_cm numeric,
  chest_cm numeric,
  shoulders_cm numeric,
  bicep_cm numeric,
  legs_cm numeric,
  note text,
  season_id uuid references seasons,
  created_at timestamptz default now()
);

-- FINANCE ACCOUNTS
create table finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  currency text,
  icon text,
  current_balance numeric default 0,
  is_savings boolean default false,
  include_in_total boolean default true,
  sort_order int,
  created_at timestamptz default now()
);

-- EXPENSE CATEGORIES
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  icon text,
  color text,
  parent_id uuid references expense_categories,
  created_at timestamptz default now()
);

-- EXPENSE GROUPS
create table expense_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  icon text,
  color text,
  created_at timestamptz default now()
);

-- TRANSACTIONS
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  account_id uuid references finance_accounts,
  category_id uuid references expense_categories,
  subcategory_id uuid references expense_categories,
  group_id uuid references expense_groups,
  amount numeric,
  currency text,
  amount_eur numeric,
  description text,
  date date,
  season_id uuid references seasons,
  created_at timestamptz default now()
);
-- If adding to existing DB: ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES expense_categories(id);

-- NOTES
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  type text,
  content text,
  audio_url text,
  linked_skill_id uuid references skills,
  date date,
  season_id uuid references seasons,
  created_at timestamptz default now()
);

-- AI REPORTS
create table ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  week_start date,
  week_end date,
  report_json jsonb,
  generated_at timestamptz,
  season_id uuid references seasons,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- PROGRESS SNAPSHOTS
create table progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  snapshot_date date,
  month_number int,
  data jsonb,
  season_id uuid references seasons,
  created_at timestamptz default now()
);

-- PUSH SUBSCRIPTIONS
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users unique,
  subscription jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ============ ROW LEVEL SECURITY ============

alter table profiles enable row level security;
alter table seasons enable row level security;
alter table skills enable row level security;
alter table habits enable row level security;
alter table daily_logs enable row level security;
alter table deep_work_sessions enable row level security;
alter table nutrition_logs enable row level security;
alter table workout_templates enable row level security;
alter table exercises enable row level security;
alter table template_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_sets enable row level security;
alter table body_measurements enable row level security;
alter table finance_accounts enable row level security;
alter table expense_categories enable row level security;
alter table expense_groups enable row level security;
alter table transactions enable row level security;
alter table notes enable row level security;
alter table ai_reports enable row level security;
alter table progress_snapshots enable row level security;
alter table push_subscriptions enable row level security;

-- RLS Policies (user can only access their own data)
create policy "own data" on profiles for all using (auth.uid() = id);
create policy "own data" on seasons for all using (auth.uid() = user_id);
create policy "own data" on skills for all using (auth.uid() = user_id);
create policy "own data" on habits for all using (auth.uid() = user_id);
create policy "own data" on daily_logs for all using (auth.uid() = user_id);
create policy "own data" on deep_work_sessions for all using (auth.uid() = user_id);
create policy "own data" on nutrition_logs for all using (auth.uid() = user_id);
create policy "own data" on workout_templates for all using (auth.uid() = user_id);
create policy "own data" on exercises for all using (auth.uid() = user_id);
create policy "own data" on workout_sessions for all using (auth.uid() = user_id);
create policy "own data" on body_measurements for all using (auth.uid() = user_id);
create policy "own data" on finance_accounts for all using (auth.uid() = user_id);
create policy "own data" on expense_categories for all using (auth.uid() = user_id);
create policy "own data" on expense_groups for all using (auth.uid() = user_id);
create policy "own data" on transactions for all using (auth.uid() = user_id);
create policy "own data" on notes for all using (auth.uid() = user_id);
create policy "own data" on ai_reports for all using (auth.uid() = user_id);
create policy "own data" on progress_snapshots for all using (auth.uid() = user_id);
create policy "own data" on push_subscriptions for all using (auth.uid() = user_id);

-- Template exercises: accessible if user owns the template
create policy "own template exercises" on template_exercises for all
  using (exists (
    select 1 from workout_templates wt
    where wt.id = template_exercises.template_id
    and wt.user_id = auth.uid()
  ));

-- Workout sets: accessible if user owns the session
create policy "own workout sets" on workout_sets for all
  using (exists (
    select 1 from workout_sessions ws
    where ws.id = workout_sets.session_id
    and ws.user_id = auth.uid()
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
