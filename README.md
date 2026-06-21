# T6X — Monk Mode Tracker

> 6 months. No excuses.

A PWA self-improvement tracker for workouts, habits, finances, focus sessions, and personal progress across a 6-month season.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com)

---

## Features

### 🏠 Home
- Daily XP bar with 20-level system (Новачок → Легенда Сезону)
- Skill streak trackers + quick habit grid
- Deep Work minute logger
- Daily motivational quote (deterministic by day-of-year)
- Streak freeze (1× per month) + trophy → achievements page

### 💪 Body
- Workout logger: templates, sets/reps/weight, rest timers
- Nutrition tracker (calories + macros vs. daily goal)
- Body measurements with progress photo upload

### 🧠 Focus
- Skill-based stopwatch timer
- Habit log per skill (checkbox / note / counter)
- Manual hours entry for offline sessions

### 💰 Finance
- Multi-currency accounts (UAH / EUR / USD)
- Income / Expense / Transfer with hierarchical categories
- Monthly balance summary

### 📊 Analytics
- XP & streak overview
- Body: weight/measurements chart + photo gallery
- Focus: hours per skill breakdown
- Finance: income vs. expense chart
- AI: weekly Grok-powered coaching report

### ⚙️ Settings
- **Profile**: name, season start date, sleep/reminder times → Goals (Point B)
- **Body**: calorie/protein goals, custom exercise library, workout templates
- **Skills**: skill + habit CRUD (inline, no separate page)
- **Finance**: multi-currency accounts + category tree
- **AI**: Grok API key
- **Account**: 🇺🇦 / 🇬🇧 language switcher, JSON export, sign out

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Charts | Recharts |
| UI | shadcn/ui |
| AI | Grok API (xAI) |
| PWA | Web App Manifest + Service Worker |
| i18n | Custom React context (UK / EN) |

---

## Architecture

```
app/
├── (auth)/          # Login, signup, onboarding
├── (tabs)/          # Tab-based main pages
│   ├── home/
│   ├── body/
│   ├── focus/
│   ├── finance/
│   ├── analytics/
│   └── settings/
├── achievements/    # 40-achievement grid
└── settings/goals/  # Point B goals (body / finance / skills)

components/
├── body/            # WorkoutSection, NutritionSection, MeasurementsSection
├── finance/         # TransactionSheet, AccountPicker
├── home/            # XPBar, StreakCard, HabitGrid
├── layout/          # TabBar, BottomSheet
└── ui/              # shadcn components, Toaster

lib/
├── achievements.ts  # 40 achievements with unlock + XP award logic
├── i18n/            # UK/EN translations with React context
├── quotes.ts        # 50 quotes (day-of-year deterministic)
├── supabase/        # Server + browser Supabase clients
├── types/           # All TypeScript interfaces
└── xp.ts            # Level system (20 levels, 0–185000 XP)
```

---

## Setup

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)

### 1. Clone & install

```bash
git clone <repo-url>
cd T6X
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database

Run migrations in Supabase SQL editor. Key tables:
`profiles`, `skills`, `habits`, `daily_logs`, `exercises`, `workout_templates`, `template_exercises`, `workout_sets`, `nutrition_logs`, `body_measurements`, `finance_accounts`, `expense_categories`, `transactions`, `notes`, `xp_events`, `user_achievements`, `ai_reports`.

Enable RLS on all tables with user-scoped policies.

### 4. Storage

Create a private bucket named `measurement-photos` in Supabase Storage.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## RLS (Security)

All tables have Row Level Security enabled. Each policy follows the pattern:

```sql
CREATE POLICY "user owns row" ON table_name
  FOR ALL USING (auth.uid() = user_id);
```

Profiles use `auth.uid() = id` (no `user_id` column).

---

## PWA Icons

Pre-generated at `public/icons/icon-192.png` and `public/icons/icon-512.png`.

---

## AI Weekly Report

Set a Grok API key in Settings → AI. The report appears in Analytics → AI every Monday.

---

## License

Private — personal use only.
