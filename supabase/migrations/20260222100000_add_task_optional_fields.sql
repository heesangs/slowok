-- tasks 테이블에 선택적 컨텍스트 컬럼 추가
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS memo text,
  ADD COLUMN IF NOT EXISTS desired_subtask_count integer,
  ADD COLUMN IF NOT EXISTS target_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS due_date date;

-- save_task_with_subtasks RPC에 새 파라미터 추가
-- 기존 함수(구 시그니처) 제거 후 새 함수 생성
DROP FUNCTION IF EXISTS public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb);

CREATE OR REPLACE FUNCTION public.save_task_with_subtasks(
  p_task_id uuid,
  p_user_id uuid,
  p_title text,
  p_total_estimated_minutes integer,
  p_subtasks jsonb,
  p_memo text DEFAULT NULL,
  p_desired_subtask_count integer DEFAULT NULL,
  p_target_duration_minutes integer DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 로그인 사용자만 호출 가능 + 본인 user_id만 허용
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '요청 사용자 정보가 일치하지 않습니다.';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION '과제 제목이 비어 있습니다.';
  END IF;

  IF p_subtasks IS NULL
     OR jsonb_typeof(p_subtasks) <> 'array'
     OR jsonb_array_length(p_subtasks) = 0 THEN
    RAISE EXCEPTION '하위 과제 목록이 비어 있습니다.';
  END IF;

  INSERT INTO public.tasks (
    id,
    user_id,
    title,
    status,
    total_estimated_minutes,
    memo,
    desired_subtask_count,
    target_duration_minutes,
    due_date
  )
  VALUES (
    p_task_id,
    p_user_id,
    p_title,
    'pending',
    p_total_estimated_minutes,
    p_memo,
    p_desired_subtask_count,
    p_target_duration_minutes,
    p_due_date
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
    (item->>'id')::uuid,
    p_task_id,
    NULLIF(item->>'parent_subtask_id', '')::uuid,
    COALESCE((item->>'depth')::integer, 0),
    item->>'title',
    item->>'difficulty',
    NULLIF(item->>'ai_suggested_difficulty', ''),
    COALESCE((item->>'estimated_minutes')::integer, 0),
    COALESCE((item->>'ai_suggested_minutes')::integer, 0),
    COALESCE((item->>'sort_order')::integer, 0),
    'pending'
  FROM jsonb_array_elements(p_subtasks) AS item;
END;
$$;

-- 기본 공개 실행 권한 제거
REVOKE ALL ON FUNCTION public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb, text, integer, integer, date) FROM PUBLIC;

-- 인증 사용자/서버 키에서 실행 가능
GRANT EXECUTE ON FUNCTION public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb, text, integer, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb, text, integer, integer, date) TO service_role;
