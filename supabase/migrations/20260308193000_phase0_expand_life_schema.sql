-- Phase 0: slowgoes 개편 스키마 확장
-- 범위: 신규 테이블 3개 + profiles/tasks 컬럼 추가

-- 1) 삶의 영역
CREATE TABLE IF NOT EXISTS public.life_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) 버킷 (삶의 장면)
CREATE TABLE IF NOT EXISTS public.buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  life_area_id uuid REFERENCES public.life_areas(id),
  title text NOT NULL CHECK (btrim(title) <> ''),
  horizon text NOT NULL DEFAULT 'someday' CHECK (horizon IN ('someday', 'this_year', 'this_season')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 3) 챕터 (시즌 목표)
CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket_id uuid REFERENCES public.buckets(id),
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

-- profiles 확장
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS life_clock_age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS personality_type text,
  ADD COLUMN IF NOT EXISTS pace_type text,
  ADD COLUMN IF NOT EXISTS onboarding_version integer DEFAULT 1;

-- tasks 확장
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id),
  ADD COLUMN IF NOT EXISTS bucket_id uuid REFERENCES public.buckets(id),
  ADD COLUMN IF NOT EXISTS is_daily_step boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condition text;

-- 기존 데이터와 충돌 없이 점진 적용되도록 CHECK 제약은 조건부로 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IS NULL OR gender IN ('male', 'female'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_personality_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_personality_type_check
      CHECK (personality_type IS NULL OR personality_type IN ('IT', 'IF', 'ET', 'EF'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pace_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_pace_type_check
      CHECK (pace_type IS NULL OR pace_type IN ('slow', 'balanced', 'focused', 'recovery'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_condition_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_condition_check
      CHECK (condition IS NULL OR condition IN ('light', 'normal', 'focused', 'tired'));
  END IF;
END;
$$;
