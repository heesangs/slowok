"use server";

// 과제 관련 서버 액션 — 인증 확인 후 AI 분석 및 DB 저장

import { createClient } from "@/lib/supabase/server";
import { analyzeTask, decomposeSubtask } from "@/lib/ai/analyze";
import type { AISubtaskSuggestion, EditableSubtask, Profile } from "@/types";

// 인증된 사용자 ID 반환 (미인증 시 에러)
async function getAuthUserId() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("로그인이 필요합니다.");
  return { supabase, userId: user.id };
}

// 프로필 조회
async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data as Profile | null;
}

/**
 * 과제 분석 — AI가 하위 과제로 분해
 */
export async function analyzeTaskAction(title: string): Promise<{
  success: boolean;
  data?: AISubtaskSuggestion[];
  error?: string;
}> {
  try {
    const { supabase, userId } = await getAuthUserId();
    const profile = await getProfile(supabase, userId);
    const suggestions = await analyzeTask(title, profile);
    return { success: true, data: suggestions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 하위 과제 추가 분해 — AI가 더 작은 단계로 분해
 */
export async function decomposeSubtaskAction(
  parentTitle: string,
  taskTitle: string
): Promise<{
  success: boolean;
  data?: AISubtaskSuggestion[];
  error?: string;
}> {
  try {
    const { supabase, userId } = await getAuthUserId();
    const profile = await getProfile(supabase, userId);
    const suggestions = await decomposeSubtask(parentTitle, taskTitle, profile);
    return { success: true, data: suggestions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "분해 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 과제 저장 — RPC로 tasks + subtasks를 단일 트랜잭션으로 INSERT
 * 어느 한쪽이라도 실패하면 전체 롤백됨
 */
export async function saveTaskAction(data: {
  title: string;
  subtasks: EditableSubtask[];
}): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
}> {
  try {
    const { supabase, userId } = await getAuthUserId();

    // 총 예상 시간 계산 — leaf 노드(자식이 없는 노드)만 합산
    const totalMinutes = data.subtasks
      .filter((s) => !data.subtasks.some((c) => c.parent_temp_id === s.temp_id))
      .reduce((sum, s) => sum + s.estimated_minutes, 0);

    const taskId = crypto.randomUUID();

    // subtask 행을 RPC용 jsonb 배열로 변환
    const subtaskRows = data.subtasks.map((s) => ({
      id: s.temp_id,
      parent_subtask_id: s.parent_temp_id,
      depth: s.depth,
      title: s.title,
      difficulty: s.difficulty,
      ai_suggested_difficulty: s.ai_suggested_difficulty,
      estimated_minutes: s.estimated_minutes,
      ai_suggested_minutes: s.ai_suggested_minutes,
      sort_order: s.sort_order,
    }));

    const { error } = await supabase.rpc("save_task_with_subtasks", {
      p_task_id: taskId,
      p_user_id: userId,
      p_title: data.title,
      p_total_estimated_minutes: totalMinutes,
      p_subtasks: subtaskRows,
    });

    if (error) throw new Error(`과제 저장 실패: ${error.message}`);

    return { success: true, taskId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.",
    };
  }
}
