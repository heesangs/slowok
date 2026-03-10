// 공통 타입 정의

export type TaskStatus = "pending" | "in_progress" | "completed";

export type Difficulty = "easy" | "medium" | "hard";

export type SelfLevel = "low" | "medium" | "high";

export type UserContext = "student" | "university" | "work" | "personal";

// v2 온보딩/개편 도메인 타입
export type Gender = "male" | "female";
export type PersonalityType = "IT" | "IF" | "ET" | "EF";
export type PaceType = "slow" | "balanced" | "focused" | "recovery";
export type OnboardingVersion = 1 | 2;

export type LifeAreaName =
  | "건강"
  | "관계"
  | "성장"
  | "경험"
  | "일"
  | "내면"
  | "돈";

export type BucketHorizon = "someday" | "this_year" | "this_season";
export type HorizonLevel = BucketHorizon | "this_week";
export type BucketStatus = "not_started" | "in_progress" | "completed" | "paused";
export type ChapterStatus = "active" | "completed" | "paused";
export type TaskCondition = "light" | "normal" | "focused" | "tired";
export type PaceAdjustOption =
  | "lighter"
  | "more_specific"
  | "once_per_week"
  | "start_this_week"
  | "start_today";

export interface Profile {
  id: string;
  display_name: string | null;
  grade: string | null;
  subjects: string[] | null;
  self_level: SelfLevel;
  user_context: UserContext[];
  life_clock_age?: number | null;
  gender?: Gender | null;
  personality_type?: PersonalityType | null;
  pace_type?: PaceType | null;
  onboarding_version?: number | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  total_estimated_minutes: number | null;
  total_actual_minutes: number | null;
  created_at: string;
  completed_at: string | null;
  memo?: string | null;
  desired_subtask_count?: number | null;
  target_duration_minutes?: number | null;
  due_date?: string | null; // ISO date "YYYY-MM-DD"
  chapter_id?: string | null;
  bucket_id?: string | null;
  is_daily_step?: boolean;
  condition?: TaskCondition | null;
}

// 폼 → 액션 전달용 입력 데이터
export interface TaskInputData {
  title: string;
  memo?: string;
  desiredSubtaskCount?: number; // undefined = AI 추천
  targetDurationMinutes?: number; // undefined = AI 추천
  dueDate?: string; // ISO date "YYYY-MM-DD"
  bucketId?: string;
  chapterId?: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  parent_subtask_id: string | null;
  depth: number;
  title: string;
  difficulty: Difficulty;
  ai_suggested_difficulty: Difficulty | null;
  estimated_minutes: number;
  ai_suggested_minutes: number | null;
  actual_minutes: number | null;
  sort_order: number;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}

// AI 응답용 하위 과제 제안 타입
export interface AISubtaskSuggestion {
  title: string;
  difficulty: Difficulty;
  estimated_minutes: number;
}

// 과제 + 하위 과제 조인 타입
export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
  bucket?: Pick<Bucket, "id" | "title"> | null;
}

// 과제 통계 타입
export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  estimatedMinutesTotal: number;
  actualMinutesTotal: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
}

// 클라이언트 편집용 하위 과제 타입
export interface EditableSubtask {
  temp_id: string;
  parent_temp_id: string | null;
  depth: number;
  title: string;
  difficulty: Difficulty;
  ai_suggested_difficulty: Difficulty;
  estimated_minutes: number;
  ai_suggested_minutes: number;
  sort_order: number;
  is_decomposing: boolean;
}

// 메모 템플릿 타입
export interface MemoTemplate {
  id: string;
  user_id: string;
  label: string;
  content: string;
  sort_order: number;
  created_at: string;
}

// v2 개편 도메인 엔티티
export interface LifeArea {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Bucket {
  id: string;
  user_id: string;
  life_area_id: string | null;
  title: string;
  horizon: BucketHorizon;
  status: BucketStatus;
  created_at: string;
  completed_at: string | null;
}

export interface Chapter {
  id: string;
  user_id: string;
  bucket_id: string | null;
  title: string;
  description: string | null;
  status: ChapterStatus;
  start_date: string | null; // ISO date "YYYY-MM-DD"
  end_date: string | null; // ISO date "YYYY-MM-DD"
  created_at: string;
}

export interface BucketWithRelations extends Bucket {
  life_area?: LifeArea | null;
  chapters?: Chapter[];
}

export interface ChapterWithRelations extends Chapter {
  bucket?: Bucket | null;
}

// 온보딩 v2 타입
export interface OnboardingV2Step1Input {
  age: number;
  gender: Gender;
  personalityType: PersonalityType;
}

export interface OnboardingSceneCategory {
  key: "must_do" | "life_scene" | "dont_miss";
  label: string;
}

export interface DemoSceneItem {
  id: string;
  text: string;
  category: OnboardingSceneCategory["key"];
}

export interface HorizonAction {
  level: HorizonLevel;
  label: string;
  action: string;
}

export interface LifeSceneAnalysisResult {
  lifeArea: string;
  empathyMessage: string;
  horizons: HorizonAction[];
}

export interface FirstStepPlanResult {
  estimatedMinutes: number;
  difficulty: Difficulty;
  subtasks: AISubtaskSuggestion[];
}

export interface BucketDecompositionSuggestion {
  chapterTitle: string;
  chapterDescription: string;
  firstAction: string;
}

export interface OnboardingV2SavePayload {
  sceneText: string;
  selectedWeeklyAction: string;
  lifeArea: string;
  age: number;
  gender: Gender;
  personalityType: PersonalityType;
  paceType: PaceType;
  plan: FirstStepPlanResult;
}

// 대시보드 v2 타입
export interface LifeBalanceInsight {
  focusArea: string | null;
  neglectedArea: string | null;
  steadyArea: string | null;
  message: string;
}

export interface ReviewSummary {
  completedCount: number;
  recentEstimatedMinutes: number | null;
  recentActualMinutes: number | null;
  recentDifficultyBefore: Difficulty | null;
  recentDifficultyAfter: Difficulty | null;
  recentMemo: string | null;
  insight: string | null;
}

export interface DashboardV2Data {
  profile: Profile;
  activeChapters: Chapter[];
  dailyStep: TaskWithSubtasks | null;
  balance: LifeBalanceInsight | null;
  suggestedBucket: Bucket | null;
  review: ReviewSummary | null;
}
