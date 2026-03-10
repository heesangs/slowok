-- Phase 4-3: 난이도/시간 조정 학습 이력 테이블

CREATE TABLE IF NOT EXISTS public.difficulty_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  subtask_id uuid REFERENCES public.subtasks(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'task_create'
    CHECK (source IN ('task_create', 'subtask_decompose', 'manual')),
  ai_difficulty text NOT NULL
    CHECK (ai_difficulty IN ('easy', 'medium', 'hard')),
  final_difficulty text NOT NULL
    CHECK (final_difficulty IN ('easy', 'medium', 'hard')),
  ai_estimated_minutes integer NOT NULL CHECK (ai_estimated_minutes > 0),
  final_estimated_minutes integer NOT NULL CHECK (final_estimated_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.difficulty_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "difficulty_adjustments_select_own" ON public.difficulty_adjustments;
CREATE POLICY "difficulty_adjustments_select_own"
  ON public.difficulty_adjustments
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "difficulty_adjustments_insert_own" ON public.difficulty_adjustments;
CREATE POLICY "difficulty_adjustments_insert_own"
  ON public.difficulty_adjustments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "difficulty_adjustments_update_own" ON public.difficulty_adjustments;
CREATE POLICY "difficulty_adjustments_update_own"
  ON public.difficulty_adjustments
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "difficulty_adjustments_delete_own" ON public.difficulty_adjustments;
CREATE POLICY "difficulty_adjustments_delete_own"
  ON public.difficulty_adjustments
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_difficulty_adjustments_user_created
  ON public.difficulty_adjustments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_difficulty_adjustments_task_id
  ON public.difficulty_adjustments(task_id);
