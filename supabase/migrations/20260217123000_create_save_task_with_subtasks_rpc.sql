-- tasks + subtasks 저장을 원자적으로 처리하는 RPC 함수
-- 하나라도 실패하면 전체가 롤백된다.
drop function if exists public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb);

create or replace function public.save_task_with_subtasks(
  p_task_id uuid,
  p_user_id uuid,
  p_title text,
  p_total_estimated_minutes integer,
  p_subtasks jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 로그인 사용자만 호출 가능 + 본인 user_id만 허용
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if auth.uid() <> p_user_id then
    raise exception '요청 사용자 정보가 일치하지 않습니다.';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception '과제 제목이 비어 있습니다.';
  end if;

  if p_subtasks is null
     or jsonb_typeof(p_subtasks) <> 'array'
     or jsonb_array_length(p_subtasks) = 0 then
    raise exception '하위 과제 목록이 비어 있습니다.';
  end if;

  insert into public.tasks (
    id,
    user_id,
    title,
    status,
    total_estimated_minutes
  )
  values (
    p_task_id,
    p_user_id,
    p_title,
    'pending',
    p_total_estimated_minutes
  );

  insert into public.subtasks (
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
  select
    (item->>'id')::uuid,
    p_task_id,
    nullif(item->>'parent_subtask_id', '')::uuid,
    coalesce((item->>'depth')::integer, 0),
    item->>'title',
    item->>'difficulty',
    nullif(item->>'ai_suggested_difficulty', ''),
    coalesce((item->>'estimated_minutes')::integer, 0),
    coalesce((item->>'ai_suggested_minutes')::integer, 0),
    coalesce((item->>'sort_order')::integer, 0),
    'pending'
  from jsonb_array_elements(p_subtasks) as item;
end;
$$;

-- 기본 공개 실행 권한 제거
revoke all on function public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb) from public;

-- 인증 사용자/서버 키에서 실행 가능
grant execute on function public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb) to authenticated;
grant execute on function public.save_task_with_subtasks(uuid, uuid, text, integer, jsonb) to service_role;
