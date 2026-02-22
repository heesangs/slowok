ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_context text[] DEFAULT '{}';

COMMENT ON COLUMN profiles.user_context IS
  'Array of user context types: student | university | work | personal';
