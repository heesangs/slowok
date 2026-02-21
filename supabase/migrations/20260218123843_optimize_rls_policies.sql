-- RLS 정책 성능 최적화
-- - auth.uid() 호출을 (select auth.uid()) 형태로 변경
-- - 정책 대상 컬럼 인덱스 보강

-- RLS 활성화 보장
alter table if exists public.profiles enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.subtasks enable row level security;

-- RLS 성능 보강용 인덱스
create index if not exists idx_tasks_user_id on public.tasks (user_id);
create index if not exists idx_subtasks_task_id on public.subtasks (task_id);

-- profiles 정책 최적화
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = '본인 프로필 조회,수정, 생성'
  ) then
    execute '
      alter policy "본인 프로필 조회,수정, 생성"
      on public.profiles
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id)
    ';
  else
    execute '
      create policy "본인 프로필 조회,수정, 생성"
      on public.profiles
      for all
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id)
    ';
  end if;
end $$;

-- tasks 정책 최적화
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = '본인 과제 조회,수정,생성,삭제'
  ) then
    execute '
      alter policy "본인 과제 조회,수정,생성,삭제"
      on public.tasks
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id)
    ';
  else
    execute '
      create policy "본인 과제 조회,수정,생성,삭제"
      on public.tasks
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id)
    ';
  end if;
end $$;

-- subtasks 정책 최적화
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subtasks'
      and policyname = '본인 하위과제 조회,생성,수정,삭제'
  ) then
    execute '
      alter policy "본인 하위과제 조회,생성,수정,삭제"
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
  else
    execute '
      create policy "본인 하위과제 조회,생성,수정,삭제"
      on public.subtasks
      for all
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
end $$;
