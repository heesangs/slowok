// 과제 통계 집계 유틸리티

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Difficulty,
  DifficultyLearningSummary,
  ReviewPageData,
  ReviewRecentItem,
  ReviewSummary,
  ReviewTimeBand,
  ReviewTimeBandStat,
  TaskStats,
  TaskWithSubtasks,
} from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const TWO_WEEKS_DAYS = 14;
const REVIEW_TASK_LIMIT = 80;
const REVIEW_RECENT_LIMIT = 12;
const LEARNING_SAMPLE_LIMIT = 120;

type ReviewTaskRow = Pick<
  TaskWithSubtasks,
  | "id"
  | "title"
  | "memo"
  | "created_at"
  | "completed_at"
  | "total_estimated_minutes"
  | "total_actual_minutes"
  | "subtasks"
> & {
  bucket?: {
    id: string;
    title: string;
    life_area?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  } | Array<{
    id: string;
    title: string;
    life_area?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  }> | null;
};

interface DifficultyAdjustmentRow {
  ai_difficulty: Difficulty;
  final_difficulty: Difficulty;
  ai_estimated_minutes: number;
  final_estimated_minutes: number;
}

function toUtcIsoDaysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function isSubtaskLeaf(targetId: string, all: TaskWithSubtasks["subtasks"]) {
  return !all.some((item) => item.parent_subtask_id === targetId);
}

function getModeDifficulty(values: Array<Difficulty | null | undefined>): Difficulty | null {
  const count: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const value of values) {
    if (!value) continue;
    count[value] += 1;
  }

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  if (!sorted[0] || sorted[0][1] === 0) return null;
  return sorted[0][0] as Difficulty;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return round(values.reduce((sum, cur) => sum + cur, 0) / values.length);
}

function difficultyRank(value: Difficulty) {
  if (value === "easy") return 0;
  if (value === "medium") return 1;
  return 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveTimeBand(dateIso: string): ReviewTimeBand {
  const hour = new Date(dateIso).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

function buildLearningSummary(rows: DifficultyAdjustmentRow[]): DifficultyLearningSummary {
  if (rows.length === 0) {
    return {
      tendency: "neutral",
      sampleSize: 0,
      averageTimeMultiplier: null,
    };
  }

  let totalDifficultyDelta = 0;
  let ratioSum = 0;
  let ratioCount = 0;

  for (const row of rows) {
    totalDifficultyDelta += difficultyRank(row.final_difficulty) - difficultyRank(row.ai_difficulty);
    if (row.ai_estimated_minutes > 0 && row.final_estimated_minutes > 0) {
      ratioSum += row.final_estimated_minutes / row.ai_estimated_minutes;
      ratioCount += 1;
    }
  }

  const avgDelta = totalDifficultyDelta / rows.length;
  const tendency: DifficultyLearningSummary["tendency"] =
    avgDelta <= -0.25 ? "easier" : avgDelta >= 0.25 ? "harder" : "neutral";

  return {
    tendency,
    sampleSize: rows.length,
    averageTimeMultiplier: ratioCount > 0 ? round(clamp(ratioSum / ratioCount, 0.7, 1.4)) : null,
  };
}

function buildReviewInsight(
  completedTasks: ReviewTaskRow[],
  averageEstimatedMinutes: number | null,
  averageActualMinutes: number | null,
  strongestBand: ReviewTimeBand | null,
  timeBandCounts: Record<ReviewTimeBand, number>,
  learning: DifficultyLearningSummary
) {
  if (completedTasks.length < 6) return null;

  const morning = timeBandCounts.morning;
  const evening = timeBandCounts.evening;

  if (strongestBand === "morning" && morning >= Math.max(3, evening + 2)) {
    return "요즘 당신은 오전에 작은 한 걸음을 가장 안정적으로 이어가고 있어요.";
  }

  if (strongestBand === "evening" && evening >= Math.max(3, morning + 2)) {
    return "저녁 시간대에 실행력이 살아나요. 중요한 한 걸음은 저녁 루틴에 배치해보세요.";
  }

  if (
    averageEstimatedMinutes &&
    averageActualMinutes &&
    averageActualMinutes > averageEstimatedMinutes * 1.25
  ) {
    return "예상보다 실제 시간이 더 길게 나와요. 시작 전 예상 시간을 20% 넉넉히 잡아보세요.";
  }

  if (
    averageEstimatedMinutes &&
    averageActualMinutes &&
    averageActualMinutes < averageEstimatedMinutes * 0.75
  ) {
    return "실행 속도가 좋습니다. 현재 기준보다 약간 도전적인 한 걸음도 충분히 해낼 수 있어요.";
  }

  if (learning.sampleSize >= 5 && learning.tendency === "easier") {
    return "난이도를 조금 낮춘 계획에서 완주율이 좋아요. 진입 장벽을 낮춘 시작이 잘 맞습니다.";
  }

  if (learning.sampleSize >= 5 && learning.tendency === "harder") {
    return "조금 더 도전적인 난이도에서 몰입이 생기는 패턴이에요. 핵심 한 걸음을 깊게 잡아보세요.";
  }

  if (averageEstimatedMinutes && averageEstimatedMinutes >= 30) {
    return "30분 내외의 한 걸음에서 가장 안정적인 리듬을 보이고 있어요.";
  }

  return "작은 실행을 꾸준히 이어가는 힘이 점점 더 단단해지고 있어요.";
}

function buildReviewSummary(tasks: ReviewTaskRow[], insight: string | null): ReviewSummary | null {
  if (tasks.length === 0) return null;

  const latest = tasks[0];
  const latestSubtasks = latest.subtasks ?? [];
  const leafSubtasks = latestSubtasks.filter((subtask) => isSubtaskLeaf(subtask.id, latestSubtasks));
  const base = leafSubtasks.length > 0 ? leafSubtasks : latestSubtasks;

  return {
    completedCount: tasks.length,
    recentEstimatedMinutes: latest.total_estimated_minutes ?? null,
    recentActualMinutes: latest.total_actual_minutes ?? null,
    recentDifficultyBefore: getModeDifficulty(base.map((subtask) => subtask.ai_suggested_difficulty)),
    recentDifficultyAfter: getModeDifficulty(base.map((subtask) => subtask.difficulty)),
    recentMemo: latest.memo ?? null,
    insight,
  };
}

function toRecentItem(task: ReviewTaskRow): ReviewRecentItem {
  const subtasks = task.subtasks ?? [];
  const leafSubtasks = subtasks.filter((subtask) => isSubtaskLeaf(subtask.id, subtasks));
  const base = leafSubtasks.length > 0 ? leafSubtasks : subtasks;
  const bucket = normalizeRelation(task.bucket);
  const lifeArea = normalizeRelation(bucket?.life_area);

  return {
    id: task.id,
    title: task.title,
    completedAt: task.completed_at ?? task.created_at,
    estimatedMinutes: task.total_estimated_minutes ?? null,
    actualMinutes: task.total_actual_minutes ?? null,
    difficultyBefore: getModeDifficulty(base.map((subtask) => subtask.ai_suggested_difficulty)),
    difficultyAfter: getModeDifficulty(base.map((subtask) => subtask.difficulty)),
    memo: task.memo ?? null,
    bucketTitle: bucket?.title ?? null,
    lifeAreaName: lifeArea?.name ?? null,
  };
}

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

export async function getReviewPageData(
  supabase: SupabaseClient,
  userId: string
): Promise<ReviewPageData | null> {
  const [completedTasksResult, learningResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, memo, created_at, completed_at, total_estimated_minutes, total_actual_minutes, subtasks(*), bucket:buckets(id, title, life_area:life_areas(id, name))"
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(REVIEW_TASK_LIMIT),
    supabase
      .from("difficulty_adjustments")
      .select("ai_difficulty, final_difficulty, ai_estimated_minutes, final_estimated_minutes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LEARNING_SAMPLE_LIMIT),
  ]);

  if (completedTasksResult.error) {
    throw new Error(completedTasksResult.error.message);
  }

  const completedTasks = (completedTasksResult.data as unknown as ReviewTaskRow[] | null) ?? [];
  if (completedTasks.length === 0) {
    return null;
  }

  const learningRows =
    learningResult.error || !learningResult.data
      ? []
      : (learningResult.data as DifficultyAdjustmentRow[]);
  const learning = buildLearningSummary(learningRows);

  const estimatedValues = completedTasks
    .map((task) => task.total_estimated_minutes)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const actualValues = completedTasks
    .map((task) => task.total_actual_minutes)
    .filter((value): value is number => typeof value === "number" && value > 0);

  const gapValues = completedTasks
    .map((task) => ({
      estimated: task.total_estimated_minutes,
      actual: task.total_actual_minutes,
    }))
    .filter(
      (value): value is { estimated: number; actual: number } =>
        typeof value.estimated === "number" &&
        value.estimated > 0 &&
        typeof value.actual === "number" &&
        value.actual > 0
    )
    .map((value) => value.actual - value.estimated);

  const completedInLast14Days = completedTasks.filter((task) => {
    if (!task.completed_at) return false;
    return task.completed_at >= toUtcIsoDaysAgo(TWO_WEEKS_DAYS);
  }).length;

  const timeBandCounts: Record<ReviewTimeBand, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };
  for (const task of completedTasks) {
    const completedAt = task.completed_at ?? task.created_at;
    const band = resolveTimeBand(completedAt);
    timeBandCounts[band] += 1;
  }

  const timeBandStats: ReviewTimeBandStat[] = [
    { band: "morning", label: "오전 (05~11시)", count: timeBandCounts.morning },
    { band: "afternoon", label: "오후 (12~17시)", count: timeBandCounts.afternoon },
    { band: "evening", label: "저녁 (18~22시)", count: timeBandCounts.evening },
    { band: "night", label: "밤 (23~04시)", count: timeBandCounts.night },
  ];

  const strongestBandStat = [...timeBandStats].sort((a, b) => b.count - a.count)[0];
  const strongestBand =
    strongestBandStat && strongestBandStat.count > 0 ? strongestBandStat.band : null;

  const averageEstimatedMinutes = average(estimatedValues);
  const averageActualMinutes = average(actualValues);
  const averageGapMinutes = average(gapValues);
  const insight = buildReviewInsight(
    completedTasks,
    averageEstimatedMinutes,
    averageActualMinutes,
    strongestBand,
    timeBandCounts,
    learning
  );

  return {
    completedCount: completedTasks.length,
    completedInLast14Days,
    averageEstimatedMinutes,
    averageActualMinutes,
    averageGapMinutes,
    strongestBand,
    timeBandStats,
    learning,
    insight,
    summary: buildReviewSummary(completedTasks, insight),
    recent: completedTasks.slice(0, REVIEW_RECENT_LIMIT).map(toRecentItem),
  };
}
