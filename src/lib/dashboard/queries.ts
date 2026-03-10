import type { SupabaseClient } from "@supabase/supabase-js";
import { getReviewPageData } from "@/lib/stats";
import type {
  Bucket,
  Chapter,
  Difficulty,
  LifeArea,
  LifeBalanceInsight,
  Profile,
  ReviewSummary,
  Subtask,
  Task,
  TaskCondition,
  TaskWithSubtasks,
} from "@/types";

type DashboardSupabase = SupabaseClient;

const DAY_MS = 24 * 60 * 60 * 1000;
const TWO_WEEKS_DAYS = 14;

function toClientError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return new Error(error.message);
  }
  return new Error(fallback);
}

function toUtcIsoDaysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function isSubtaskLeaf(target: Subtask, all: Subtask[]) {
  return !all.some((item) => item.parent_subtask_id === target.id);
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

function getTaskDifficulty(task: TaskWithSubtasks): Difficulty {
  const subtasks = task.subtasks ?? [];
  if (subtasks.length === 0) return "medium";

  const leafSubtasks = subtasks.filter((item) => isSubtaskLeaf(item, subtasks));
  const base = leafSubtasks.length > 0 ? leafSubtasks : subtasks;
  const mode = getModeDifficulty(base.map((item) => item.difficulty));
  return mode ?? "medium";
}

function getTaskEstimatedMinutes(task: TaskWithSubtasks) {
  if (typeof task.total_estimated_minutes === "number" && task.total_estimated_minutes > 0) {
    return task.total_estimated_minutes;
  }

  const subtasks = task.subtasks ?? [];
  const leafSubtasks = subtasks.filter((item) => isSubtaskLeaf(item, subtasks));
  const base = leafSubtasks.length > 0 ? leafSubtasks : subtasks;
  const sum = base.reduce((acc, cur) => acc + (cur.estimated_minutes ?? 0), 0);
  return sum > 0 ? sum : 15;
}

function difficultyToScore(value: Difficulty) {
  if (value === "easy") return 0;
  if (value === "medium") return 1;
  return 2;
}

function scoreTaskByCondition(task: TaskWithSubtasks, condition: TaskCondition) {
  const minutes = getTaskEstimatedMinutes(task);
  const difficulty = getTaskDifficulty(task);
  const difficultyScore = difficultyToScore(difficulty);
  const statusBoost = task.status === "in_progress" ? 15 : 0;
  const dailyBoost = task.is_daily_step ? 20 : 0;
  const conditionBoost = task.condition === condition ? 18 : 0;

  if (condition === "focused") {
    const longTaskBoost = Math.min(minutes, 90) * 0.45;
    const difficultyBoost = difficultyScore * 14;
    const tooShortPenalty = minutes < 20 ? 12 : 0;
    return statusBoost + dailyBoost + conditionBoost + longTaskBoost + difficultyBoost - tooShortPenalty;
  }

  if (condition === "light") {
    const shortTaskBoost = Math.max(0, 35 - minutes) * 1.1;
    const difficultyBoost = difficulty === "easy" ? 18 : difficulty === "medium" ? 8 : -10;
    return statusBoost + dailyBoost + conditionBoost + shortTaskBoost + difficultyBoost;
  }

  if (condition === "tired") {
    const ultraShortBoost = Math.max(0, 25 - minutes) * 1.2;
    const difficultyBoost = difficulty === "easy" ? 20 : difficulty === "medium" ? 6 : -16;
    return statusBoost + dailyBoost + conditionBoost + ultraShortBoost + difficultyBoost;
  }

  const targetMinutes = 30;
  const closenessPenalty = Math.abs(minutes - targetMinutes) * 0.6;
  const difficultyBalanceBoost = difficulty === "medium" ? 10 : difficulty === "easy" ? 4 : 0;
  return statusBoost + dailyBoost + conditionBoost + difficultyBalanceBoost - closenessPenalty;
}

function pickTaskByCondition(
  tasks: TaskWithSubtasks[],
  condition: TaskCondition
): TaskWithSubtasks | null {
  if (tasks.length === 0) return null;

  if (condition === "normal") {
    const preferred = tasks.find((task) => task.is_daily_step);
    if (preferred) return preferred;
  }

  const ranked = [...tasks].sort((a, b) => {
    const scoreDiff = scoreTaskByCondition(b, condition) - scoreTaskByCondition(a, condition);
    if (scoreDiff !== 0) return scoreDiff;

    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });

  return ranked[0] ?? null;
}

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildBalanceMessage(insight: LifeBalanceInsight) {
  if (!insight.focusArea && !insight.neglectedArea && !insight.steadyArea) {
    return "아직 데이터가 모이고 있어요. 조금만 더 사용하면 패턴이 보일 거예요.";
  }

  const parts: string[] = [];
  if (insight.focusArea) {
    parts.push(`이번 시즌 손이 많이 가는 영역은 ${insight.focusArea}이에요.`);
  }
  if (insight.neglectedArea) {
    parts.push(`최근 놓치고 있는 영역은 ${insight.neglectedArea}이에요.`);
  }
  if (!insight.neglectedArea && insight.steadyArea) {
    parts.push(`${insight.steadyArea} 영역은 작게라도 꾸준히 이어가고 있어요.`);
  }
  return parts.join(" ");
}

export async function getProfile(supabase: DashboardSupabase, userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as Profile | null) ?? null;
  } catch (error) {
    throw toClientError(error, "프로필 정보를 불러오지 못했습니다.");
  }
}

export async function getActiveChapters(
  supabase: DashboardSupabase,
  userId: string
): Promise<Chapter[]> {
  try {
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      throw error;
    }

    return (data as Chapter[] | null) ?? [];
  } catch (error) {
    throw toClientError(error, "챕터 정보를 불러오지 못했습니다.");
  }
}

export async function getDailyStep(
  supabase: DashboardSupabase,
  userId: string,
  condition: TaskCondition = "normal"
): Promise<TaskWithSubtasks | null> {
  try {
    const baseSelect = "*, subtasks(*), bucket:buckets(id, title)";
    const { data, error } = await supabase
      .from("tasks")
      .select(baseSelect)
      .eq("user_id", userId)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      throw error;
    }

    const candidates = (data as TaskWithSubtasks[] | null) ?? [];
    return pickTaskByCondition(candidates, condition);
  } catch (error) {
    throw toClientError(error, "오늘의 한 걸음을 불러오지 못했습니다.");
  }
}

export async function getLifeBalance(
  supabase: DashboardSupabase,
  userId: string
): Promise<LifeBalanceInsight | null> {
  try {
    const [lifeAreasResult, bucketsResult, completedTasksResult] = await Promise.all([
      supabase
        .from("life_areas")
        .select("id, name")
        .eq("user_id", userId),
      supabase
        .from("buckets")
        .select("id, life_area_id, status")
        .eq("user_id", userId),
      supabase
        .from("tasks")
        .select("bucket_id, completed_at")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("completed_at", toUtcIsoDaysAgo(TWO_WEEKS_DAYS)),
    ]);

    if (lifeAreasResult.error) throw lifeAreasResult.error;
    if (bucketsResult.error) throw bucketsResult.error;
    if (completedTasksResult.error) throw completedTasksResult.error;

    const lifeAreas = (lifeAreasResult.data as Array<Pick<LifeArea, "id" | "name">> | null) ?? [];
    const buckets =
      (bucketsResult.data as Array<Pick<Bucket, "id" | "life_area_id" | "status">> | null) ?? [];
    const completedTasks =
      (completedTasksResult.data as Array<Pick<Task, "bucket_id" | "completed_at">> | null) ?? [];

    if (lifeAreas.length === 0 && buckets.length === 0) {
      return {
        focusArea: null,
        neglectedArea: null,
        steadyArea: null,
        message: "아직 데이터가 모이고 있어요. 조금만 더 사용하면 패턴이 보일 거예요.",
      };
    }

    const areaNameById = new Map<string, string>();
    for (const area of lifeAreas) {
      areaNameById.set(area.id, area.name);
    }

    const areaStatMap = new Map<string, { activeBuckets: number; completedTasks: number }>();
    for (const area of lifeAreas) {
      areaStatMap.set(area.name, { activeBuckets: 0, completedTasks: 0 });
    }

    const bucketAreaMap = new Map<string, string>();
    for (const bucket of buckets) {
      if (!bucket.life_area_id) continue;
      const areaName = areaNameById.get(bucket.life_area_id);
      if (!areaName) continue;

      bucketAreaMap.set(bucket.id, areaName);
      const stat = areaStatMap.get(areaName) ?? { activeBuckets: 0, completedTasks: 0 };
      if (bucket.status === "in_progress") {
        stat.activeBuckets += 1;
      }
      areaStatMap.set(areaName, stat);
    }

    for (const task of completedTasks) {
      if (!task.bucket_id) continue;
      const areaName = bucketAreaMap.get(task.bucket_id);
      if (!areaName) continue;
      const stat = areaStatMap.get(areaName) ?? { activeBuckets: 0, completedTasks: 0 };
      stat.completedTasks += 1;
      areaStatMap.set(areaName, stat);
    }

    const stats = Array.from(areaStatMap.entries()).map(([name, value]) => ({
      name,
      activeBuckets: value.activeBuckets,
      completedTasks: value.completedTasks,
      score: value.activeBuckets * 2 + value.completedTasks,
    }));

    if (stats.length === 0) {
      return {
        focusArea: null,
        neglectedArea: null,
        steadyArea: null,
        message: "아직 데이터가 모이고 있어요. 조금만 더 사용하면 패턴이 보일 거예요.",
      };
    }

    const sortedByScore = [...stats].sort((a, b) => b.score - a.score);
    const focusArea = sortedByScore[0]?.score > 0 ? sortedByScore[0].name : null;

    const neglectedCandidate = stats.find((item) => item.activeBuckets === 0 && item.completedTasks === 0);
    const neglectedArea = neglectedCandidate?.name ?? null;

    const steadyCandidate = stats
      .filter((item) => item.completedTasks > 0 && item.name !== focusArea)
      .sort((a, b) => b.completedTasks - a.completedTasks)[0];
    const steadyArea = steadyCandidate?.name ?? null;

    const insight: LifeBalanceInsight = {
      focusArea,
      neglectedArea,
      steadyArea,
      message: "",
    };
    insight.message = buildBalanceMessage(insight);
    return insight;
  } catch (error) {
    throw toClientError(error, "인생 균형 데이터를 불러오지 못했습니다.");
  }
}

export async function getUnstartedBucket(
  supabase: DashboardSupabase,
  userId: string
): Promise<Bucket | null> {
  try {
    const { data, error } = await supabase
      .from("buckets")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "not_started")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const buckets = (data as Bucket[] | null) ?? [];
    if (buckets.length === 0) return null;

    const todayIndex = Math.floor(Date.now() / DAY_MS);
    const offset = hashSeed(userId) % buckets.length;
    const index = (todayIndex + offset) % buckets.length;
    return buckets[index];
  } catch (error) {
    throw toClientError(error, "추천 버킷을 불러오지 못했습니다.");
  }
}

export async function getReviewData(
  supabase: DashboardSupabase,
  userId: string
): Promise<ReviewSummary | null> {
  try {
    const reviewData = await getReviewPageData(supabase, userId);
    return reviewData?.summary ?? null;
  } catch (error) {
    throw toClientError(error, "회고 데이터를 불러오지 못했습니다.");
  }
}
