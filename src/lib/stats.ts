// 과제 통계 집계 유틸리티

import { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStats, TaskWithSubtasks } from "@/types";

export async function getTaskStats(
  supabase: SupabaseClient,
  userId: string
): Promise<TaskStats> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, subtasks(*)")
    .eq("user_id", userId);

  const allTasks = (tasks as TaskWithSubtasks[] | null) ?? [];

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;

  // 모든 subtask 취합
  const allSubtasks = allTasks.flatMap((t) => t.subtasks);
  const totalSubtasks = allSubtasks.length;
  const completedSubtasks = allSubtasks.filter((s) => s.status === "completed").length;

  // 시간 합산: tasks 테이블의 total_estimated_minutes / total_actual_minutes 사용
  let estimatedMinutesTotal = 0;
  let actualMinutesTotal = 0;
  for (const task of allTasks) {
    if (task.total_estimated_minutes) {
      estimatedMinutesTotal += task.total_estimated_minutes;
    }
    if (task.total_actual_minutes) {
      actualMinutesTotal += task.total_actual_minutes;
    }
  }

  // 난이도 분포: 완료된 leaf subtask (children이 없는 subtask)
  const parentIds = new Set(
    allSubtasks
      .filter((s) => s.parent_subtask_id)
      .map((s) => s.parent_subtask_id)
  );
  const completedLeaves = allSubtasks.filter(
    (s) => s.status === "completed" && !parentIds.has(s.id)
  );

  const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
  for (const s of completedLeaves) {
    if (s.difficulty in difficultyDistribution) {
      difficultyDistribution[s.difficulty as keyof typeof difficultyDistribution] += 1;
    }
  }

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    totalSubtasks,
    completedSubtasks,
    estimatedMinutesTotal,
    actualMinutesTotal,
    difficultyDistribution,
  };
}
