-- Run this in Supabase SQL Editor

ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'expense';

-- Insert default income categories for all existing users
INSERT INTO expense_categories (user_id, name, icon, color, transaction_type, parent_id)
SELECT
  p.id,
  c.name,
  c.icon,
  '#00FF85',
  'income',
  NULL
FROM profiles p
CROSS JOIN (VALUES
  ('Зарплата',    '💼'),
  ('Фріланс',     '💻'),
  ('Подарунок',   '🎁'),
  ('Повернення',  '↩️'),
  ('Стипендія',   '🎓'),
  ('Інший дохід', '💰')
) AS c(name, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories e
  WHERE e.user_id = p.id AND e.transaction_type = 'income'
);
