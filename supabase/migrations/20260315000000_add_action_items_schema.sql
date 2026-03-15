-- Action Items v1 (점진 마이그레이션용)
-- 기존 tasks/subtasks는 유지하고 daily_todos + routines + horizon_analyses + action_logs를 추가한다.

-- 1) 데일리 투두 (주간 일회성)
CREATE TABLE IF NOT EXISTS public.daily_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket_id uuid REFERENCES public.buckets(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (btrim(title) <> ''),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  source text NOT NULL DEFAULT 'onboarding' CHECK (source IN ('onboarding', 'ai_generated', 'manual')),
  action_tip text,
  action_tip_generated_at timestamptz,
  week_start date NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 2) 루틴 (반복 항목)
CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket_id uuid REFERENCES public.buckets(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (btrim(title) <> ''),
  source text NOT NULL DEFAULT 'onboarding' CHECK (source IN ('onboarding', 'ai_generated', 'manual')),
  repeat_unit text NOT NULL DEFAULT 'weekly' CHECK (repeat_unit IN ('daily', 'weekly')),
  repeat_value integer NOT NULL DEFAULT 1 CHECK (repeat_value >= 1 AND repeat_value <= 31),
  action_tip text,
  action_tip_generated_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) 루틴 완료 기록 (주 단위)
CREATE TABLE IF NOT EXISTS public.routine_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::date,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, week_start)
);

-- 4) 호라이즌 분석 캐시 (버킷별)
CREATE TABLE IF NOT EXISTS public.horizon_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket_id uuid NOT NULL REFERENCES public.buckets(id) ON DELETE CASCADE,
  life_area text NOT NULL CHECK (btrim(life_area) <> ''),
  empathy_message text NOT NULL DEFAULT '',
  horizons jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_routines jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_id)
);

-- 5) 행동 로그 (회고 기록용)
CREATE TABLE IF NOT EXISTS public.action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket_id uuid REFERENCES public.buckets(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('daily_todo', 'routine')),
  item_id uuid NOT NULL,
  title text NOT NULL CHECK (btrim(title) <> ''),
  ai_advice text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_todos_user_week ON public.daily_todos(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_daily_todos_bucket ON public.daily_todos(bucket_id);
CREATE INDEX IF NOT EXISTS idx_daily_todos_status ON public.daily_todos(user_id, status);

CREATE INDEX IF NOT EXISTS idx_routines_user_active ON public.routines(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_routines_bucket ON public.routines(bucket_id);

CREATE INDEX IF NOT EXISTS idx_routine_completions_user_week ON public.routine_completions(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_routine_completions_routine_week ON public.routine_completions(routine_id, week_start);

CREATE INDEX IF NOT EXISTS idx_horizon_analyses_user_bucket ON public.horizon_analyses(user_id, bucket_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_completed_at ON public.action_logs(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_bucket ON public.action_logs(bucket_id);

-- RLS 활성화
ALTER TABLE IF EXISTS public.daily_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.horizon_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.action_logs ENABLE ROW LEVEL SECURITY;

-- daily_todos 정책
DROP POLICY IF EXISTS "daily_todos_select_own" ON public.daily_todos;
CREATE POLICY "daily_todos_select_own" ON public.daily_todos
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "daily_todos_insert_own" ON public.daily_todos;
CREATE POLICY "daily_todos_insert_own" ON public.daily_todos
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "daily_todos_update_own" ON public.daily_todos;
CREATE POLICY "daily_todos_update_own" ON public.daily_todos
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "daily_todos_delete_own" ON public.daily_todos;
CREATE POLICY "daily_todos_delete_own" ON public.daily_todos
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- routines 정책
DROP POLICY IF EXISTS "routines_select_own" ON public.routines;
CREATE POLICY "routines_select_own" ON public.routines
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "routines_insert_own" ON public.routines;
CREATE POLICY "routines_insert_own" ON public.routines
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "routines_update_own" ON public.routines;
CREATE POLICY "routines_update_own" ON public.routines
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "routines_delete_own" ON public.routines;
CREATE POLICY "routines_delete_own" ON public.routines
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- routine_completions 정책
DROP POLICY IF EXISTS "routine_completions_select_own" ON public.routine_completions;
CREATE POLICY "routine_completions_select_own" ON public.routine_completions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "routine_completions_insert_own" ON public.routine_completions;
CREATE POLICY "routine_completions_insert_own" ON public.routine_completions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "routine_completions_delete_own" ON public.routine_completions;
CREATE POLICY "routine_completions_delete_own" ON public.routine_completions
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- horizon_analyses 정책
DROP POLICY IF EXISTS "horizon_analyses_select_own" ON public.horizon_analyses;
CREATE POLICY "horizon_analyses_select_own" ON public.horizon_analyses
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "horizon_analyses_insert_own" ON public.horizon_analyses;
CREATE POLICY "horizon_analyses_insert_own" ON public.horizon_analyses
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "horizon_analyses_update_own" ON public.horizon_analyses;
CREATE POLICY "horizon_analyses_update_own" ON public.horizon_analyses
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "horizon_analyses_delete_own" ON public.horizon_analyses;
CREATE POLICY "horizon_analyses_delete_own" ON public.horizon_analyses
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- action_logs 정책
DROP POLICY IF EXISTS "action_logs_select_own" ON public.action_logs;
CREATE POLICY "action_logs_select_own" ON public.action_logs
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "action_logs_insert_own" ON public.action_logs;
CREATE POLICY "action_logs_insert_own" ON public.action_logs
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "action_logs_update_own" ON public.action_logs;
CREATE POLICY "action_logs_update_own" ON public.action_logs
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "action_logs_delete_own" ON public.action_logs;
CREATE POLICY "action_logs_delete_own" ON public.action_logs
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- 온보딩 저장 RPC (daily_todos + routines + horizon_analyses)
DROP FUNCTION IF EXISTS public.save_onboarding_journey(
  uuid,
  text,
  text,
  text[],
  text,
  text[],
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
);

CREATE OR REPLACE FUNCTION public.save_onboarding_journey(
  p_user_id uuid,
  p_display_name text,
  p_self_level text,
  p_user_context text[] DEFAULT ARRAY[]::text[],
  p_grade text DEFAULT NULL,
  p_subjects text[] DEFAULT ARRAY[]::text[],
  p_life_clock_age integer DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_personality_type text DEFAULT NULL,
  p_pace_type text DEFAULT NULL,
  p_scene_text text DEFAULT NULL,
  p_life_area_name text DEFAULT NULL,
  p_chapter_title text DEFAULT NULL,
  p_bucket_horizon text DEFAULT 'someday',
  p_horizon_analysis jsonb DEFAULT '{}'::jsonb,
  p_daily_todos jsonb DEFAULT '[]'::jsonb,
  p_routines jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_life_area_id uuid;
  v_bucket_id uuid;
  v_chapter_id uuid;
  v_subjects text[];
  v_user_context text[];
  v_scene_text text;
  v_life_area_name text;
  v_chapter_title text;
  v_week_start date := date_trunc('week', CURRENT_DATE)::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '요청 사용자 정보가 일치하지 않습니다.';
  END IF;

  v_scene_text := btrim(COALESCE(p_scene_text, ''));
  v_life_area_name := btrim(COALESCE(p_life_area_name, ''));
  v_chapter_title := btrim(COALESCE(p_chapter_title, ''));
  v_subjects := COALESCE(p_subjects, ARRAY[]::text[]);
  v_user_context := COALESCE(p_user_context, ARRAY[]::text[]);

  IF btrim(COALESCE(p_display_name, '')) = '' THEN
    RAISE EXCEPTION '닉네임을 입력해주세요.';
  END IF;
  IF p_self_level IS NULL OR p_self_level NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION '속도 값이 올바르지 않습니다.';
  END IF;
  IF p_life_clock_age IS NULL OR p_life_clock_age < 0 OR p_life_clock_age > 100 THEN
    RAISE EXCEPTION '나이 값이 올바르지 않습니다.';
  END IF;
  IF p_gender IS NULL OR p_gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION '성별 값이 올바르지 않습니다.';
  END IF;
  IF p_personality_type IS NULL OR p_personality_type NOT IN ('IT', 'IF', 'ET', 'EF') THEN
    RAISE EXCEPTION '성향 값이 올바르지 않습니다.';
  END IF;
  IF p_pace_type IS NULL OR p_pace_type NOT IN ('slow', 'balanced', 'focused', 'recovery') THEN
    RAISE EXCEPTION '페이스 값이 올바르지 않습니다.';
  END IF;
  IF v_scene_text = '' THEN
    RAISE EXCEPTION '삶의 장면이 비어 있습니다.';
  END IF;
  IF v_life_area_name = '' THEN
    RAISE EXCEPTION '삶의 영역이 비어 있습니다.';
  END IF;
  IF p_bucket_horizon IS NULL OR p_bucket_horizon NOT IN ('someday', 'this_year', 'this_season') THEN
    RAISE EXCEPTION '버킷 시간 지평 값이 올바르지 않습니다.';
  END IF;
  IF jsonb_typeof(p_daily_todos) <> 'array' THEN
    RAISE EXCEPTION 'daily_todos 형식이 올바르지 않습니다.';
  END IF;
  IF jsonb_typeof(p_routines) <> 'array' THEN
    RAISE EXCEPTION 'routines 형식이 올바르지 않습니다.';
  END IF;

  INSERT INTO public.profiles (
    id,
    display_name,
    grade,
    subjects,
    self_level,
    user_context,
    life_clock_age,
    gender,
    personality_type,
    pace_type,
    onboarding_version
  )
  VALUES (
    p_user_id,
    btrim(p_display_name),
    NULLIF(btrim(COALESCE(p_grade, '')), ''),
    v_subjects,
    p_self_level,
    v_user_context,
    p_life_clock_age,
    p_gender,
    p_personality_type,
    p_pace_type,
    2
  )
  ON CONFLICT (id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    grade = EXCLUDED.grade,
    subjects = EXCLUDED.subjects,
    self_level = EXCLUDED.self_level,
    user_context = EXCLUDED.user_context,
    life_clock_age = EXCLUDED.life_clock_age,
    gender = EXCLUDED.gender,
    personality_type = EXCLUDED.personality_type,
    pace_type = EXCLUDED.pace_type,
    onboarding_version = 2;

  SELECT id
  INTO v_life_area_id
  FROM public.life_areas
  WHERE user_id = p_user_id
    AND name = v_life_area_name
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_life_area_id IS NULL THEN
    INSERT INTO public.life_areas (user_id, name, sort_order)
    VALUES (p_user_id, v_life_area_name, 0)
    RETURNING id INTO v_life_area_id;
  END IF;

  INSERT INTO public.buckets (
    user_id,
    life_area_id,
    title,
    horizon,
    status
  ) VALUES (
    p_user_id,
    v_life_area_id,
    v_scene_text,
    p_bucket_horizon,
    'in_progress'
  )
  RETURNING id INTO v_bucket_id;

  IF v_chapter_title = '' THEN
    v_chapter_title := v_scene_text || ' 이번 시즌 실행';
  END IF;

  INSERT INTO public.chapters (
    user_id,
    bucket_id,
    title,
    status,
    start_date
  ) VALUES (
    p_user_id,
    v_bucket_id,
    v_chapter_title,
    'active',
    CURRENT_DATE
  )
  RETURNING id INTO v_chapter_id;

  INSERT INTO public.horizon_analyses (
    user_id,
    bucket_id,
    life_area,
    empathy_message,
    horizons,
    suggested_routines,
    updated_at
  ) VALUES (
    p_user_id,
    v_bucket_id,
    v_life_area_name,
    COALESCE(NULLIF(btrim(p_horizon_analysis->>'empathyMessage'), ''), ''),
    COALESCE(p_horizon_analysis->'horizons', '[]'::jsonb),
    COALESCE(p_horizon_analysis->'suggestedRoutines', '[]'::jsonb),
    now()
  )
  ON CONFLICT (bucket_id)
  DO UPDATE SET
    life_area = EXCLUDED.life_area,
    empathy_message = EXCLUDED.empathy_message,
    horizons = EXCLUDED.horizons,
    suggested_routines = EXCLUDED.suggested_routines,
    updated_at = now();

  INSERT INTO public.daily_todos (
    user_id,
    bucket_id,
    title,
    status,
    source,
    week_start,
    sort_order
  )
  SELECT
    p_user_id,
    v_bucket_id,
    btrim(item->>'title'),
    'pending',
    CASE
      WHEN (item->>'source') IN ('onboarding', 'ai_generated', 'manual') THEN item->>'source'
      ELSE 'onboarding'
    END,
    v_week_start,
    GREATEST(ord::integer - 1, 0)
  FROM jsonb_array_elements(p_daily_todos) WITH ORDINALITY AS rows(item, ord)
  WHERE btrim(COALESCE(item->>'title', '')) <> '';

  INSERT INTO public.routines (
    user_id,
    bucket_id,
    title,
    source,
    repeat_unit,
    repeat_value,
    is_active,
    sort_order
  )
  SELECT
    p_user_id,
    v_bucket_id,
    btrim(item->>'title'),
    CASE
      WHEN (item->>'source') IN ('onboarding', 'ai_generated', 'manual') THEN item->>'source'
      ELSE 'onboarding'
    END,
    CASE
      WHEN (item->>'repeatUnit') IN ('daily', 'weekly') THEN item->>'repeatUnit'
      ELSE 'weekly'
    END,
    GREATEST(1, LEAST(31, COALESCE((item->>'repeatValue')::integer, 1))),
    true,
    GREATEST(ord::integer - 1, 0)
  FROM jsonb_array_elements(p_routines) WITH ORDINALITY AS rows(item, ord)
  WHERE btrim(COALESCE(item->>'title', '')) <> '';

  RETURN v_bucket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_onboarding_journey(
  uuid,
  text,
  text,
  text[],
  text,
  text[],
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_onboarding_journey(
  uuid,
  text,
  text,
  text[],
  text,
  text[],
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) TO authenticated;
