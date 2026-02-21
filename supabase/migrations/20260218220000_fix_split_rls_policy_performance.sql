-- RLS 성능 경고 복구
-- 문제 배경:
-- - 실제 정책은 "조회/수정/생성/삭제"로 분리되어 있었는데,
--   합쳐진 정책명 기준으로 최적화를 시도하면서 기존 분리 정책이 남았다.
-- - 결과적으로 분리 정책(auth.uid() 직접 호출) 경고가 계속 발생할 수 있다.
--
-- 이 마이그레이션은:
-- 1) 잘못 추가된 합본 정책 제거
-- 2) 실제 분리 정책 11개를 (select auth.uid()) 형태로 교정

-- 1) 합본 정책 제거(존재할 때만)
drop policy if exists "본인 프로필 조회,수정, 생성" on public.profiles;
drop policy if exists "본인 과제 조회,수정,생성,삭제" on public.tasks;
drop policy if exists "본인 하위과제 조회,생성,수정,삭제" on public.subtasks;

-- 2) profiles: 분리 정책 교정
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = '본인 프로필 조회'
  ) then
    execute '
      alter policy "본인 프로필 조회"
      on public.profiles
      to authenticated
      using ((select auth.uid()) = id)
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = '본인 프로필 수정'
  ) then
    execute '
      alter policy "본인 프로필 수정"
      on public.profiles
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id)
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = '본인 프로필 생성'
  ) then
    execute '
      alter policy "본인 프로필 생성"
      on public.profiles
      to authenticated
      with check ((select auth.uid()) = id)
    ';
  end if;
end $$;

-- 3) tasks: 분리 정책 교정
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = '본인 과제 조회'
  ) then
    execute '
      alter policy "본인 과제 조회"
      on public.tasks
      to authenticated
      using ((select auth.uid()) = user_id)
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = '본인 과제 수정'
  ) then
    execute '
      alter policy "본인 과제 수정"
      on public.tasks
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id)
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = '본인 과제 생성'
  ) then
    execute '
      alter policy "본인 과제 생성"
      on public.tasks
      to authenticated
      with check ((select auth.uid()) = user_id)
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = '본인 과제 삭제'
  ) then
    execute '
      alter policy "본인 과제 삭제"
      on public.tasks
      to authenticated
      using ((select auth.uid()) = user_id)
    ';
  end if;
end $$;

-- 4) subtasks: 분리 정책 교정
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subtasks'
      and policyname = '본인 하위과제 조회'
  ) then
    execute '
      alter policy "본인 하위과제 조회"
      on public.subtasks
      to authenticated
      using (
        exists (
          select 1
          from public.tasks t
          where t.id = task_id
            and t.user_id = (select auth.uid())
        )
      )
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subtasks'
      and policyname = '본인 하위과제 수정'
  ) then
    execute '
      alter policy "본인 하위과제 수정"
      on public.subtasks
      to authenticated
      using (
        exists (
          select 1
          from public.tasks t
          where t.id = task_id
            and t.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.tasks t
          where t.id = task_id
            and t.user_id = (select auth.uid())
        )
      )
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subtasks'
      and policyname = '본인 하위과제 생성'
  ) then
    execute '
      alter policy "본인 하위과제 생성"
      on public.subtasks
      to authenticated
      with check (
        exists (
          select 1
          from public.tasks t
          where t.id = task_id
            and t.user_id = (select auth.uid())
        )
      )
    ';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subtasks'
      and policyname = '본인 하위과제 삭제'
  ) then
    execute '
      alter policy "본인 하위과제 삭제"
      on public.subtasks
      to authenticated
      using (
        exists (
          select 1
          from public.tasks t
          where t.id = task_id
            and t.user_id = (select auth.uid())
        )
      )
    ';
  end if;
end $$;
