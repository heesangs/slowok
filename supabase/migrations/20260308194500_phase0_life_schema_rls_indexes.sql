-- Phase 0: 신규 생애 도메인 테이블 RLS + 인덱스
-- 범위: life_areas, buckets, chapters
-- + tasks의 신규 FK 인덱스(chapter_id, bucket_id)

-- RLS 활성화
ALTER TABLE IF EXISTS public.life_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chapters ENABLE ROW LEVEL SECURITY;

-- life_areas 정책
DROP POLICY IF EXISTS "life_areas_select_own" ON public.life_areas;
CREATE POLICY "life_areas_select_own" ON public.life_areas
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "life_areas_insert_own" ON public.life_areas;
CREATE POLICY "life_areas_insert_own" ON public.life_areas
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "life_areas_update_own" ON public.life_areas;
CREATE POLICY "life_areas_update_own" ON public.life_areas
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "life_areas_delete_own" ON public.life_areas;
CREATE POLICY "life_areas_delete_own" ON public.life_areas
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- buckets 정책
DROP POLICY IF EXISTS "buckets_select_own" ON public.buckets;
CREATE POLICY "buckets_select_own" ON public.buckets
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "buckets_insert_own" ON public.buckets;
CREATE POLICY "buckets_insert_own" ON public.buckets
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "buckets_update_own" ON public.buckets;
CREATE POLICY "buckets_update_own" ON public.buckets
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "buckets_delete_own" ON public.buckets;
CREATE POLICY "buckets_delete_own" ON public.buckets
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- chapters 정책
DROP POLICY IF EXISTS "chapters_select_own" ON public.chapters;
CREATE POLICY "chapters_select_own" ON public.chapters
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "chapters_insert_own" ON public.chapters;
CREATE POLICY "chapters_insert_own" ON public.chapters
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "chapters_update_own" ON public.chapters;
CREATE POLICY "chapters_update_own" ON public.chapters
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "chapters_delete_own" ON public.chapters;
CREATE POLICY "chapters_delete_own" ON public.chapters
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_life_areas_user_id ON public.life_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_buckets_user_id ON public.buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_buckets_life_area_id ON public.buckets(life_area_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON public.chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_bucket_id ON public.chapters(bucket_id);
CREATE INDEX IF NOT EXISTS idx_tasks_chapter_id ON public.tasks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_bucket_id ON public.tasks(bucket_id);
