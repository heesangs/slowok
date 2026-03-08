-- 온보딩 v2 데이터를 단일 트랜잭션으로 저장하는 RPC
-- profiles + life_areas + buckets + chapters + tasks + subtasks

DROP FUNCTION IF EXISTS public.save_onboarding_data(
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
  integer,
  jsonb
);

CREATE OR REPLACE FUNCTION public.save_onboarding_data(
  p_user_id uuid,
  p_display_name text,
  p_self_level text,
  p_user_context text[],
  p_grade text DEFAULT NULL,
  p_subjects text[] DEFAULT '{}',
  p_life_clock_age integer DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_personality_type text DEFAULT NULL,
  p_pace_type text DEFAULT NULL,
  p_scene_text text DEFAULT NULL,
  p_life_area_name text DEFAULT NULL,
  p_chapter_title text DEFAULT NULL,
  p_task_title text DEFAULT NULL,
  p_total_estimated_minutes integer DEFAULT NULL,
  p_subtasks jsonb DEFAULT NULL
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
  v_task_id uuid;
  v_subjects text[];
  v_user_context text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '요청 사용자 정보가 일치하지 않습니다.';
  END IF;

  IF p_display_name IS NULL OR btrim(p_display_name) = '' THEN
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

  IF p_scene_text IS NULL OR btrim(p_scene_text) = '' THEN
    RAISE EXCEPTION '삶의 장면이 비어 있습니다.';
  END IF;

  IF p_life_area_name IS NULL OR btrim(p_life_area_name) = '' THEN
    RAISE EXCEPTION '삶의 영역이 비어 있습니다.';
  END IF;

  IF p_chapter_title IS NULL OR btrim(p_chapter_title) = '' THEN
    RAISE EXCEPTION '챕터 제목이 비어 있습니다.';
  END IF;

  IF p_task_title IS NULL OR btrim(p_task_title) = '' THEN
    RAISE EXCEPTION '첫 실행안 제목이 비어 있습니다.';
  END IF;

  IF p_subtasks IS NULL
     OR jsonb_typeof(p_subtasks) <> 'array'
     OR jsonb_array_length(p_subtasks) = 0 THEN
    RAISE EXCEPTION '세부 단계가 비어 있습니다.';
  END IF;

  v_subjects := COALESCE(p_subjects, ARRAY[]::text[]);
  v_user_context := COALESCE(p_user_context, ARRAY[]::text[]);

  IF EXISTS (
    SELECT 1
    FROM unnest(v_user_context) AS ctx(value)
    WHERE value NOT IN ('student', 'university', 'work', 'personal')
  ) THEN
    RAISE EXCEPTION '사용 목적 값이 올바르지 않습니다.';
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
  ) VALUES (
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

  INSERT INTO public.life_areas (
    user_id,
    name,
    sort_order
  ) VALUES (
    p_user_id,
    btrim(p_life_area_name),
    0
  )
  RETURNING id INTO v_life_area_id;

  INSERT INTO public.buckets (
    user_id,
    life_area_id,
    title,
    horizon,
    status
  ) VALUES (
    p_user_id,
    v_life_area_id,
    btrim(p_scene_text),
    'someday',
    'in_progress'
  )
  RETURNING id INTO v_bucket_id;

  INSERT INTO public.chapters (
    user_id,
    bucket_id,
    title,
    status,
    start_date
  ) VALUES (
    p_user_id,
    v_bucket_id,
    btrim(p_chapter_title),
    'active',
    CURRENT_DATE
  )
  RETURNING id INTO v_chapter_id;

  v_task_id := gen_random_uuid();

  INSERT INTO public.tasks (
    id,
    user_id,
    title,
    status,
    total_estimated_minutes,
    chapter_id,
    bucket_id,
    is_daily_step
  ) VALUES (
    v_task_id,
    p_user_id,
    btrim(p_task_title),
    'pending',
    GREATEST(5, COALESCE(p_total_estimated_minutes, 5)),
    v_chapter_id,
    v_bucket_id,
    true
  );

  INSERT INTO public.subtasks (
    id,
    task_id,
    parent_subtask_id,
    depth,
    title,
    difficulty,
    ai_suggested_difficulty,
    estimated_minutes,
    ai_suggested_minutes,
    sort_order,
    status
  )
  SELECT
    gen_random_uuid(),
    v_task_id,
    NULL,
    0,
    COALESCE(NULLIF(btrim(item->>'title'), ''), '실행 단계 ' || ord::text),
    CASE
      WHEN (item->>'difficulty') IN ('easy', 'medium', 'hard') THEN item->>'difficulty'
      ELSE 'medium'
    END,
    CASE
      WHEN (item->>'difficulty') IN ('easy', 'medium', 'hard') THEN item->>'difficulty'
      ELSE 'medium'
    END,
    GREATEST(
      5,
      LEAST(
        120,
        COALESCE((item->>'estimated_minutes')::integer, (item->>'estimatedMinutes')::integer, 10)
      )
    ),
    GREATEST(
      5,
      LEAST(
        120,
        COALESCE((item->>'estimated_minutes')::integer, (item->>'estimatedMinutes')::integer, 10)
      )
    ),
    GREATEST(ord::integer - 1, 0),
    'pending'
  FROM jsonb_array_elements(p_subtasks) WITH ORDINALITY AS rows(item, ord);

  RETURN v_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_onboarding_data(
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
  integer,
  jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_onboarding_data(
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
  integer,
  jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_onboarding_data(
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
  integer,
  jsonb
) TO service_role;
