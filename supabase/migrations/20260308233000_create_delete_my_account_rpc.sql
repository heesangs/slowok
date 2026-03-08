-- 회원탈퇴 RPC
-- 현재 로그인한 사용자의 앱 데이터와 auth 계정을 영구 삭제

DROP FUNCTION IF EXISTS public.delete_my_account();

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  -- 사용자 소유 데이터 정리 (명시 삭제 + FK cascade 보조)
  DELETE FROM public.subtasks
  WHERE task_id IN (
    SELECT id
    FROM public.tasks
    WHERE user_id = v_user_id
  );

  DELETE FROM public.tasks WHERE user_id = v_user_id;
  DELETE FROM public.chapters WHERE user_id = v_user_id;
  DELETE FROM public.buckets WHERE user_id = v_user_id;
  DELETE FROM public.life_areas WHERE user_id = v_user_id;
  DELETE FROM public.memo_templates WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 인증 계정 삭제 (연관 auth 데이터는 FK로 정리)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO service_role;
