// AI 할 일 분석 — Gemini API로 하위 과제 분해, 난이도/시간 제안

import { geminiModel } from "./gemini";
import type {
  AISubtaskSuggestion,
  BucketDecompositionSuggestion,
  BucketHorizon,
  Difficulty,
  FirstStepPlanResult,
  Gender,
  HorizonAction,
  LifeSceneAnalysisResult,
  PaceAdjustOption,
  PersonalityType,
  Profile,
} from "@/types";

const LIFE_AREA_OPTIONS = ["건강", "관계", "성장", "경험", "일", "돈", "내면"] as const;
const HORIZON_LABELS: Record<HorizonAction["level"], string> = {
  someday: "언젠가",
  this_year: "1년 안",
  this_season: "이번 시즌",
  this_week: "이번 주",
};

// 기존 학생 학년 여부 판별 (legacy 유저 호환)
function isLegacyStudentGrade(grade: string | null | undefined): boolean {
  if (!grade) return false;
  return /^(중|고)[1-3]$/.test(grade);
}

// JSON 응답에서 마크다운 코드펜스 제거
function parseJsonResponse(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// 시스템 정체성 빌드 (컨텍스트별 분기)
function buildSystemIdentity(profile: Profile | null): string {
  const ctx = profile?.user_context ?? [];
  const effective =
    ctx.length === 0 && isLegacyStudentGrade(profile?.grade)
      ? ["student"]
      : ctx;

  if (effective.length === 1) {
    if (effective[0] === "student")
      return "당신은 한국 학생의 학습을 돕는 AI 튜터입니다.";
    if (effective[0] === "university")
      return "당신은 대학생의 과제와 학습을 돕는 AI 조수입니다.";
    if (effective[0] === "work")
      return "당신은 업무 효율을 돕는 AI 어시스턴트입니다.";
    if (effective[0] === "personal")
      return "당신은 목표 달성을 돕는 AI 도우미입니다.";
  }
  return "당신은 사용자의 할 일을 효율적으로 관리하도록 돕는 AI 어시스턴트입니다.";
}

// 프로필 기반 컨텍스트 문자열 생성
function buildProfileContext(profile: Profile | null): string {
  if (!profile) return "사용자 정보가 없습니다.";

  const ctx = profile.user_context ?? [];
  const effectiveCtx =
    ctx.length === 0 && isLegacyStudentGrade(profile.grade)
      ? ["student"]
      : ctx;

  const parts: string[] = [];

  if (effectiveCtx.includes("student") && profile.grade) {
    parts.push(`학년: ${profile.grade}`);
    // 학교 과목만 필터
    const studentSubjects = ["국어", "영어", "수학", "과학", "사회", "기타"];
    const filtered = profile.subjects?.filter((s) => studentSubjects.includes(s)) ?? [];
    if (filtered.length > 0) parts.push(`주요 과목: ${filtered.join(", ")}`);
  }

  if (effectiveCtx.includes("university") && profile.grade) {
    parts.push(`대학 ${profile.grade.replace("대학", "").replace("원", "대학원")}`);
  }

  if (effectiveCtx.includes("work") && profile.subjects?.length) {
    const workSubjects = ["개발", "디자인", "마케팅", "기획", "영업", "연구", "관리", "기타"];
    const filtered = profile.subjects.filter((s) => workSubjects.includes(s));
    if (filtered.length > 0) parts.push(`업무 분야: ${filtered.join(", ")}`);
  }

  if (effectiveCtx.includes("personal") && profile.subjects?.length) {
    const personalSubjects = ["독서", "운동", "어학", "자격증", "창작", "기타"];
    const filtered = profile.subjects.filter((s) => personalSubjects.includes(s));
    if (filtered.length > 0) parts.push(`관심 분야: ${filtered.join(", ")}`);
  }

  if (profile.self_level) {
    const levelLabel = { low: "하", medium: "중", high: "상" }[profile.self_level];
    parts.push(`작업 속도 수준: ${levelLabel}`);
  }

  return parts.length > 0 ? parts.join("\n") : "사용자 정보가 없습니다.";
}

// student 단독 여부
function isStudentOnly(profile: Profile | null): boolean {
  const ctx = profile?.user_context ?? [];
  const effective =
    ctx.length === 0 && isLegacyStudentGrade(profile?.grade)
      ? ["student"]
      : ctx;
  return effective.length === 1 && effective[0] === "student";
}

// Gemini 에러를 사용자 친화 메시지로 변환
function mapGeminiError(error: unknown): Error {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const lower = rawMessage.toLowerCase();
  const retryMatch = rawMessage.match(/retry in\s*([\d.]+)s/i);
  const retrySeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;

  if (
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("quota")
  ) {
    return new Error(
      retrySeconds
        ? `AI 사용량 한도에 도달했어요. ${retrySeconds}초 후 다시 시도하거나 Gemini 요금제/한도를 확인해주세요.`
        : "AI 사용량 한도에 도달했어요. 잠시 후 다시 시도하거나 Gemini 요금제/한도를 확인해주세요."
    );
  }

  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("api key") ||
    lower.includes("permission")
  ) {
    return new Error("Gemini API 키 또는 권한 설정을 확인해주세요.");
  }

  return new Error("AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
}

function normalizeLifeArea(raw: unknown, sceneText: string): string {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (LIFE_AREA_OPTIONS.includes(trimmed as (typeof LIFE_AREA_OPTIONS)[number])) {
      return trimmed;
    }

    const englishToKorean: Record<string, string> = {
      health: "건강",
      relationship: "관계",
      relationships: "관계",
      growth: "성장",
      experience: "경험",
      experiences: "경험",
      work: "일",
      career: "일",
      money: "돈",
      finance: "돈",
      inner: "내면",
      mind: "내면",
    };
    const mapped = englishToKorean[trimmed.toLowerCase()];
    if (mapped) return mapped;
  }

  const lower = sceneText.toLowerCase();
  if (lower.includes("돈") || lower.includes("재테크") || lower.includes("경제")) return "돈";
  if (lower.includes("운동") || lower.includes("수면") || lower.includes("건강")) return "건강";
  if (lower.includes("결혼") || lower.includes("가족") || lower.includes("친구")) return "관계";
  if (lower.includes("여행") || lower.includes("경험")) return "경험";
  if (lower.includes("일") || lower.includes("커리어") || lower.includes("직장")) return "일";
  if (lower.includes("마음") || lower.includes("명상") || lower.includes("심리")) return "내면";
  return "성장";
}

function normalizeHorizonLevel(raw: unknown): HorizonAction["level"] | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "someday" || normalized === "this_year" || normalized === "this_season" || normalized === "this_week") {
    return normalized;
  }

  if (normalized === "year" || normalized === "one_year" || normalized === "within_year") {
    return "this_year";
  }
  if (normalized === "season" || normalized === "thisseason") {
    return "this_season";
  }
  if (normalized === "week" || normalized === "thisweek") {
    return "this_week";
  }
  if (normalized.includes("언젠")) return "someday";
  if (normalized.includes("1년")) return "this_year";
  if (normalized.includes("시즌")) return "this_season";
  if (normalized.includes("이번 주")) return "this_week";
  return null;
}

function toNonEmptyText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDifficulty(raw: unknown, fallback: Difficulty = "medium"): Difficulty {
  if (raw === "easy" || raw === "medium" || raw === "hard") return raw;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "쉬움") return "easy";
    if (normalized === "보통") return "medium";
    if (normalized === "어려움") return "hard";
  }
  return fallback;
}

function normalizeEstimatedMinutes(raw: unknown, min: number, max: number, fallback: number) {
  return Math.max(min, Math.min(max, Math.round(Number(raw) || fallback)));
}

function normalizeAISubtasks(
  rawSubtasks: unknown,
  options: { minMinutes: number; maxMinutes: number; fallbackMinutes: number; fallbackTitlePrefix: string }
): AISubtaskSuggestion[] {
  if (!Array.isArray(rawSubtasks) || rawSubtasks.length === 0) return [];

  return rawSubtasks
    .map((item, index) => {
      const row = item as {
        title?: unknown;
        difficulty?: unknown;
        estimated_minutes?: unknown;
        estimatedMinutes?: unknown;
      };
      const title = toNonEmptyText(row.title) ?? `${options.fallbackTitlePrefix} ${index + 1}`;
      const difficulty = normalizeDifficulty(row.difficulty, "medium");
      const estimated_minutes = normalizeEstimatedMinutes(
        row.estimated_minutes ?? row.estimatedMinutes,
        options.minMinutes,
        options.maxMinutes,
        options.fallbackMinutes
      );
      return { title, difficulty, estimated_minutes };
    })
    .filter((item) => item.title.length > 0);
}

function buildFallbackHorizons(sceneText: string): HorizonAction[] {
  const root = sceneText.trim();
  const someday = root;
  const thisYear = `${root}를 위한 기반을 만들어보기`;
  const thisSeason = `${root}를 위한 루틴을 시작해보기`;
  const thisWeek1 = `${root} 관련해서 바로 시작할 수 있는 정보 1개 찾아보기`;
  const thisWeek2 = `${root}를 위해 이번 주에 할 수 있는 가장 작은 행동 1개 정하기`;

  return [
    { level: "someday", label: HORIZON_LABELS.someday, action: someday },
    { level: "this_year", label: HORIZON_LABELS.this_year, action: thisYear },
    { level: "this_season", label: HORIZON_LABELS.this_season, action: thisSeason },
    { level: "this_week", label: HORIZON_LABELS.this_week, action: thisWeek1 },
    { level: "this_week", label: HORIZON_LABELS.this_week, action: thisWeek2 },
  ];
}

function normalizeHorizons(rawHorizons: unknown, sceneText: string): HorizonAction[] {
  if (!Array.isArray(rawHorizons)) {
    return buildFallbackHorizons(sceneText);
  }

  const bucket: Record<HorizonAction["level"], string[]> = {
    someday: [],
    this_year: [],
    this_season: [],
    this_week: [],
  };

  for (const row of rawHorizons) {
    const item = row as { level?: unknown; label?: unknown; action?: unknown };
    const level = normalizeHorizonLevel(item.level ?? item.label);
    if (!level) continue;
    const action = toNonEmptyText(item.action);
    if (!action) continue;
    bucket[level].push(action);
  }

  const fallback = buildFallbackHorizons(sceneText);
  if (bucket.someday.length === 0) bucket.someday.push(fallback[0].action);
  if (bucket.this_year.length === 0) bucket.this_year.push(fallback[1].action);
  if (bucket.this_season.length === 0) bucket.this_season.push(fallback[2].action);

  const weekCandidates = bucket.this_week.filter(Boolean);
  if (weekCandidates.length === 0) {
    weekCandidates.push(fallback[3].action, fallback[4].action);
  } else if (weekCandidates.length === 1) {
    weekCandidates.push(fallback[4].action);
  }

  return [
    { level: "someday", label: HORIZON_LABELS.someday, action: bucket.someday[0] },
    { level: "this_year", label: HORIZON_LABELS.this_year, action: bucket.this_year[0] },
    { level: "this_season", label: HORIZON_LABELS.this_season, action: bucket.this_season[0] },
    ...weekCandidates.slice(0, 3).map((action) => ({
      level: "this_week" as const,
      label: HORIZON_LABELS.this_week,
      action,
    })),
  ];
}

interface AnalyzeLifeSceneInput {
  sceneText: string;
  age: number;
  gender: Gender;
  personalityType: PersonalityType;
}

interface GenerateFirstStepInput {
  weeklyAction: string;
  sceneText: string;
  lifeArea: string;
  age: number;
  gender: Gender;
  personalityType: PersonalityType;
}

interface AdjustPacePlanInput extends GenerateFirstStepInput {
  option: PaceAdjustOption;
  currentPlan: FirstStepPlanResult;
}

// AI 분석 힌트 (선택 컨텍스트)
interface TaskAnalysisHints {
  memo?: string;
  desiredSubtaskCount?: number;
  targetDurationMinutes?: number;
  dueDate?: string;
}

interface DecomposeBucketInput {
  bucketTitle: string;
  horizon: BucketHorizon;
  profile: Profile | null;
  existingChapterTitles?: string[];
}

function buildPersonalityHint(personalityType: Profile["personality_type"] | undefined | null): string {
  if (personalityType === "IT") {
    return "성향 IT: 분석적이고 체계적으로, 측정 가능한 작은 단계를 제시";
  }
  if (personalityType === "IF") {
    return "성향 IF: 의미와 몰입을 살리는 조용한 실천 단계를 제시";
  }
  if (personalityType === "ET") {
    return "성향 ET: 실행 속도와 결과를 빠르게 확인할 수 있는 단계를 제시";
  }
  if (personalityType === "EF") {
    return "성향 EF: 사람과 연결되고 공감을 얻을 수 있는 단계를 제시";
  }
  return "성향 정보 없음: 부담이 낮고 명확한 실행 단계로 제시";
}

function buildPaceHint(paceType: Profile["pace_type"] | undefined | null): string {
  if (paceType === "slow") {
    return "페이스 slow: 매일 10~20분 정도의 아주 작은 행동 중심으로 제시";
  }
  if (paceType === "balanced") {
    return "페이스 balanced: 20~40분 정도의 안정적인 리듬으로 제시";
  }
  if (paceType === "focused") {
    return "페이스 focused: 주 2회 집중 세션형 행동을 포함해 제시";
  }
  if (paceType === "recovery") {
    return "페이스 recovery: 에너지 소모가 낮은 5~15분 행동 중심으로 제시";
  }
  return "페이스 정보 없음: 무리 없는 기본 페이스로 제시";
}

function buildFallbackBucketSuggestions(
  bucketTitle: string,
  horizon: BucketHorizon
): BucketDecompositionSuggestion[] {
  const horizonLabel = HORIZON_LABELS[horizon];
  const base = bucketTitle.trim();
  const firstActionDuration = horizon === "this_season" ? "15분" : "10분";

  return [
    {
      chapterTitle: `${base} 준비 루틴 만들기`,
      chapterDescription: `${horizonLabel} 목표를 시작하기 위한 기본 루틴을 정리합니다.`,
      firstAction: `${firstActionDuration} 동안 시작 체크리스트 3개 작성하기`,
    },
    {
      chapterTitle: `${base} 실행 환경 정돈하기`,
      chapterDescription: `실행을 막는 방해 요소를 줄이고 바로 시작 가능한 환경을 만듭니다.`,
      firstAction: "지금 당장 방해 요소 1개 제거하고 실행 장소 정리하기",
    },
    {
      chapterTitle: `${base} 첫 결과 만들기`,
      chapterDescription: `작은 결과물을 빠르게 만들어 동력을 확보합니다.`,
      firstAction: "오늘 끝낼 수 있는 최소 결과물 1개 정의하고 10분 시작하기",
    },
  ];
}

function normalizeBucketSuggestions(
  rawSuggestions: unknown,
  bucketTitle: string,
  horizon: BucketHorizon,
  existingChapterTitles: string[]
): BucketDecompositionSuggestion[] {
  if (!Array.isArray(rawSuggestions)) {
    return buildFallbackBucketSuggestions(bucketTitle, horizon);
  }

  const existingSet = new Set(existingChapterTitles.map((title) => title.trim()));
  const normalized = rawSuggestions
    .map((row) => {
      const item = row as {
        chapterTitle?: unknown;
        chapter_title?: unknown;
        title?: unknown;
        chapterDescription?: unknown;
        chapter_description?: unknown;
        description?: unknown;
        firstAction?: unknown;
        first_action?: unknown;
      };

      const chapterTitle =
        toNonEmptyText(item.chapterTitle) ??
        toNonEmptyText(item.chapter_title) ??
        toNonEmptyText(item.title);

      const chapterDescription =
        toNonEmptyText(item.chapterDescription) ??
        toNonEmptyText(item.chapter_description) ??
        toNonEmptyText(item.description);

      const firstAction =
        toNonEmptyText(item.firstAction) ??
        toNonEmptyText(item.first_action);

      if (!chapterTitle || !chapterDescription || !firstAction) {
        return null;
      }

      if (existingSet.has(chapterTitle)) {
        return null;
      }

      return {
        chapterTitle,
        chapterDescription,
        firstAction,
      };
    })
    .filter((row): row is BucketDecompositionSuggestion => Boolean(row))
    .slice(0, 4);

  if (normalized.length > 0) {
    return normalized;
  }

  return buildFallbackBucketSuggestions(bucketTitle, horizon)
    .filter((item) => !existingSet.has(item.chapterTitle))
    .slice(0, 3);
}

/**
 * 할 일을 3~7개 하위 과제로 분해
 */
export async function analyzeTask(
  taskTitle: string,
  profile: Profile | null,
  hints?: TaskAnalysisHints
): Promise<AISubtaskSuggestion[]> {
  const studentOnly = isStudentOnly(profile);
  const taskLabel = studentOnly ? "다음 과제를" : "다음 할 일을";
  const levelLabel = studentOnly ? "학생의 수준을 고려하여" : "사용자의 수준을 고려하여";
  const profileLabel = studentOnly ? "학생 정보:" : "사용자 정보:";

  // 힌트 블록 조건부 생성
  const countHint = hints?.desiredSubtaskCount
    ? `사용자가 약 ${hints.desiredSubtaskCount}개의 단계로 나눠주길 원합니다.`
    : "3~7개의 하위 과제로 분해해주세요.";
  const durationHint = hints?.targetDurationMinutes
    ? `전체 소요 시간을 약 ${hints.targetDurationMinutes}분 이내로 계획해주세요.`
    : "";
  const memoHint = hints?.memo ? `상세 설명: ${hints.memo}` : "";
  const dueDateHint = hints?.dueDate ? `마감일: ${hints.dueDate}` : "";

  const hintsBlock = [memoHint, durationHint, dueDateHint]
    .filter(Boolean)
    .join("\n");

  const prompt = `${buildSystemIdentity(profile)}

${profileLabel}
${buildProfileContext(profile)}

${taskLabel} ${countHint}
각 하위 과제에 대해 난이도(easy/medium/hard)와 예상 소요 시간(분)을 제안해주세요.

규칙:
- 쉬운 과제는 넉넉한 시간이 아니라 빠르게 처리할 수 있도록 짧은 시간을 제안
- 어려운 과제는 충분히 여유로운 시간을 제안 (서두르지 않도록)
- ${levelLabel} 시간을 조정
- 최소 5분, 최대 120분 범위

할 일: "${taskTitle}"
${hintsBlock ? hintsBlock + "\n" : ""}
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  { "title": "하위 과제 제목", "difficulty": "easy|medium|hard", "estimated_minutes": 숫자 }
]`;

  let parsed: AISubtaskSuggestion[];
  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    parsed = parseJsonResponse(text) as AISubtaskSuggestion[];
  } catch (error) {
    throw mapGeminiError(error);
  }

  // 유효성 검증
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI 응답이 올바르지 않습니다.");
  }

  return parsed.map((item) => ({
    title: String(item.title),
    difficulty: (["easy", "medium", "hard"].includes(item.difficulty) ? item.difficulty : "medium") as AISubtaskSuggestion["difficulty"],
    estimated_minutes: Math.max(5, Math.min(120, Math.round(Number(item.estimated_minutes) || 15))),
  }));
}

/**
 * 삶의 장면을 영역 + 시간 지평으로 분석 (온보딩 Step 3)
 */
export async function analyzeLifeScene(
  input: AnalyzeLifeSceneInput
): Promise<LifeSceneAnalysisResult> {
  const sceneText = input.sceneText.trim();
  if (!sceneText) {
    throw new Error("삶의 장면을 입력해주세요.");
  }
  if (!Number.isFinite(input.age) || input.age < 0 || input.age > 100) {
    throw new Error("나이 값이 올바르지 않습니다.");
  }

  const prompt = `당신은 slowgoes 앱의 온보딩 AI 코치입니다.
사용자의 삶의 장면을 다음 2가지를 동시에 생성하세요.

1) 삶의 영역 분류 (건강/관계/성장/경험/일/돈/내면 중 1개)
2) 시간 지평 액션 분해
- 언젠가 1개
- 1년 안 1개
- 이번 시즌 1개
- 이번 주 2~3개 (실행 가능한 아주 작은 행동)

사용자 정보:
- 나이: ${input.age}
- 성별: ${input.gender}
- 성향: ${input.personalityType}
- 삶의 장면: "${sceneText}"

규칙:
- 문장은 한국어로 작성
- 공감 메시지는 짧고 따뜻하게 1문장
- 이번 주 항목은 바로 시작 가능한 행동으로 제안
- 추상적인 표현보다 구체적인 행동으로 작성

아래 JSON 객체만 응답하세요:
{
  "lifeArea": "건강|관계|성장|경험|일|돈|내면",
  "empathyMessage": "공감 메시지",
  "horizons": [
    { "level": "someday", "label": "언젠가", "action": "..." },
    { "level": "this_year", "label": "1년 안", "action": "..." },
    { "level": "this_season", "label": "이번 시즌", "action": "..." },
    { "level": "this_week", "label": "이번 주", "action": "..." },
    { "level": "this_week", "label": "이번 주", "action": "..." }
  ]
}`;

  let parsed: unknown;
  try {
    const result = await geminiModel.generateContent(prompt);
    parsed = parseJsonResponse(result.response.text());
  } catch (error) {
    throw mapGeminiError(error);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI 응답이 올바르지 않습니다.");
  }

  const object = parsed as {
    lifeArea?: unknown;
    empathyMessage?: unknown;
    horizons?: unknown;
  };

  const lifeArea = normalizeLifeArea(object.lifeArea, sceneText);
  const empathyMessage =
    toNonEmptyText(object.empathyMessage) ?? `${lifeArea}에 대한 장면이네요, 멋져요.`;
  const horizons = normalizeHorizons(object.horizons, sceneText);

  return {
    lifeArea,
    empathyMessage,
    horizons,
  };
}

/**
 * 선택한 이번 주 행동을 첫 실행안으로 구체화 (온보딩 Step 4)
 */
export async function generateFirstStep(
  input: GenerateFirstStepInput
): Promise<FirstStepPlanResult> {
  const weeklyAction = input.weeklyAction.trim();
  const sceneText = input.sceneText.trim();
  const lifeArea = input.lifeArea.trim();

  if (!weeklyAction) {
    throw new Error("이번 주 행동이 비어 있습니다.");
  }
  if (!sceneText) {
    throw new Error("삶의 장면이 비어 있습니다.");
  }
  if (!Number.isFinite(input.age) || input.age < 0 || input.age > 100) {
    throw new Error("나이 값이 올바르지 않습니다.");
  }

  const prompt = `당신은 slowgoes 앱의 실행 코치입니다.
사용자의 '이번 주 한 걸음'을 바로 실행 가능한 세부 단계로 나눠주세요.

사용자 정보:
- 나이: ${input.age}
- 성별: ${input.gender}
- 성향: ${input.personalityType}
- 삶의 영역: ${lifeArea || "미정"}
- 삶의 장면: "${sceneText}"
- 이번 주 한 걸음: "${weeklyAction}"

규칙:
- 하위 단계는 2~4개
- 각 단계는 5~40분 사이
- 지나치게 추상적인 문장 금지, 즉시 실행 가능한 문장으로 작성
- 전체 난이도는 easy|medium|hard 중 하나
- 전체 예상 시간은 하위 단계 합에 맞춰 현실적으로 제시
- 한국어로 작성

아래 JSON 객체만 응답하세요:
{
  "estimatedMinutes": 숫자,
  "difficulty": "easy|medium|hard",
  "subtasks": [
    { "title": "단계 제목", "difficulty": "easy|medium|hard", "estimated_minutes": 숫자 }
  ]
}`;

  let parsed: unknown;
  try {
    const result = await geminiModel.generateContent(prompt);
    parsed = parseJsonResponse(result.response.text());
  } catch (error) {
    throw mapGeminiError(error);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI 응답이 올바르지 않습니다.");
  }

  const row = parsed as {
    estimatedMinutes?: unknown;
    estimated_minutes?: unknown;
    difficulty?: unknown;
    subtasks?: unknown;
  };

  let subtasks = normalizeAISubtasks(row.subtasks, {
    minMinutes: 5,
    maxMinutes: 40,
    fallbackMinutes: 10,
    fallbackTitlePrefix: "실행 단계",
  });

  if (subtasks.length === 0) {
    subtasks = [
      { title: `${weeklyAction} 관련 정보 1개 찾기`, difficulty: "easy", estimated_minutes: 5 },
      { title: `${weeklyAction} 바로 시작할 행동 1개 정하기`, difficulty: "easy", estimated_minutes: 10 },
    ];
  }

  const estimatedFromSubtasks = subtasks.reduce((sum, item) => sum + item.estimated_minutes, 0);
  const estimatedMinutes = normalizeEstimatedMinutes(
    row.estimatedMinutes ?? row.estimated_minutes ?? estimatedFromSubtasks,
    5,
    180,
    estimatedFromSubtasks
  );

  const difficulty = normalizeDifficulty(row.difficulty, "medium");

  return {
    estimatedMinutes,
    difficulty,
    subtasks,
  };
}

/**
 * 페이스 조정 (Step 4) — 현재는 "더 구체적으로" 선택 시에만 AI 재호출
 */
export async function adjustPacePlan(
  input: AdjustPacePlanInput
): Promise<FirstStepPlanResult> {
  if (input.option !== "more_specific") {
    return input.currentPlan;
  }

  const weeklyAction = input.weeklyAction.trim();
  const sceneText = input.sceneText.trim();
  const lifeArea = input.lifeArea.trim();

  if (!weeklyAction) {
    throw new Error("이번 주 행동이 비어 있습니다.");
  }
  if (!sceneText) {
    throw new Error("삶의 장면이 비어 있습니다.");
  }
  if (!Number.isFinite(input.age) || input.age < 0 || input.age > 100) {
    throw new Error("나이 값이 올바르지 않습니다.");
  }

  const currentSubtasks = input.currentPlan.subtasks
    .map((subtask, index) =>
      `${index + 1}. ${subtask.title} (${subtask.estimated_minutes}분, ${subtask.difficulty})`
    )
    .join("\n");

  const prompt = `당신은 slowgoes 앱의 실행 코치입니다.
사용자가 이미 만든 실행안을 "더 구체적으로" 조정하고 싶어합니다.
현재 실행안을 유지하면서 더 세분화된 단계로 바꿔주세요.

사용자 정보:
- 나이: ${input.age}
- 성별: ${input.gender}
- 성향: ${input.personalityType}
- 삶의 영역: ${lifeArea || "미정"}
- 삶의 장면: "${sceneText}"
- 이번 주 한 걸음: "${weeklyAction}"

현재 실행안:
${currentSubtasks || "(세부 단계 없음)"}

규칙:
- 기존 의도는 유지하고, 단계만 더 구체적으로 나눌 것
- 하위 단계는 3~6개
- 각 단계는 5~30분 사이
- 전체 난이도는 easy|medium|hard 중 하나
- 한국어로 작성

아래 JSON 객체만 응답하세요:
{
  "estimatedMinutes": 숫자,
  "difficulty": "easy|medium|hard",
  "subtasks": [
    { "title": "단계 제목", "difficulty": "easy|medium|hard", "estimated_minutes": 숫자 }
  ]
}`;

  let parsed: unknown;
  try {
    const result = await geminiModel.generateContent(prompt);
    parsed = parseJsonResponse(result.response.text());
  } catch (error) {
    throw mapGeminiError(error);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI 응답이 올바르지 않습니다.");
  }

  const row = parsed as {
    estimatedMinutes?: unknown;
    estimated_minutes?: unknown;
    difficulty?: unknown;
    subtasks?: unknown;
  };

  let subtasks = normalizeAISubtasks(row.subtasks, {
    minMinutes: 5,
    maxMinutes: 30,
    fallbackMinutes: 10,
    fallbackTitlePrefix: "실행 단계",
  });

  // "더 구체적으로" 요청인데 단계가 줄어드는 경우를 방지하기 위한 최소 보정
  if (subtasks.length <= input.currentPlan.subtasks.length) {
    const fallbackSubtasks: AISubtaskSuggestion[] = [
      {
        title: `${weeklyAction} 시작 전 체크리스트 1개 작성하기`,
        difficulty: "easy",
        estimated_minutes: 5,
      },
      ...input.currentPlan.subtasks.map((item) => ({
        title: item.title,
        difficulty: item.difficulty,
        estimated_minutes: normalizeEstimatedMinutes(item.estimated_minutes, 5, 30, 10),
      })),
    ];
    subtasks = fallbackSubtasks.slice(0, 6);
  }

  const estimatedFromSubtasks = subtasks.reduce((sum, item) => sum + item.estimated_minutes, 0);
  const estimatedMinutes = normalizeEstimatedMinutes(
    row.estimatedMinutes ?? row.estimated_minutes ?? estimatedFromSubtasks,
    5,
    180,
    estimatedFromSubtasks
  );
  const difficulty = normalizeDifficulty(row.difficulty, input.currentPlan.difficulty);

  return {
    estimatedMinutes,
    difficulty,
    subtasks,
  };
}

/**
 * 하위 과제를 2~4개로 추가 분해 (depth +1)
 */
export async function decomposeSubtask(
  parentTitle: string,
  taskTitle: string,
  profile: Profile | null
): Promise<AISubtaskSuggestion[]> {
  const studentOnly = isStudentOnly(profile);
  const levelLabel = studentOnly ? "학생의 수준을 고려" : "사용자의 수준을 고려";
  const profileLabel = studentOnly ? "학생 정보:" : "사용자 정보:";
  const taskLabel = studentOnly ? "상위 과제" : "상위 할 일";
  const subtaskLabel = studentOnly ? "분해할 하위 과제" : "분해할 세부 항목";

  const prompt = `${buildSystemIdentity(profile)}

${profileLabel}
${buildProfileContext(profile)}

${taskLabel}: "${taskTitle}"
${subtaskLabel}: "${parentTitle}"

이 항목을 2~4개의 더 작은 단계로 분해해주세요.
각 단계에 대해 난이도(easy/medium/hard)와 예상 소요 시간(분)을 제안해주세요.

규칙:
- 쉬운 단계는 짧은 시간, 어려운 단계는 여유로운 시간
- ${levelLabel}
- 최소 5분, 최대 60분 범위

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  { "title": "단계 제목", "difficulty": "easy|medium|hard", "estimated_minutes": 숫자 }
]`;

  let parsed: AISubtaskSuggestion[];
  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    parsed = parseJsonResponse(text) as AISubtaskSuggestion[];
  } catch (error) {
    throw mapGeminiError(error);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI 응답이 올바르지 않습니다.");
  }

  return parsed.map((item) => ({
    title: String(item.title),
    difficulty: (["easy", "medium", "hard"].includes(item.difficulty) ? item.difficulty : "medium") as AISubtaskSuggestion["difficulty"],
    estimated_minutes: Math.max(5, Math.min(60, Math.round(Number(item.estimated_minutes) || 10))),
  }));
}

/**
 * 버킷(삶의 장면)을 2~4개의 챕터 + 첫 행동으로 분해
 */
export async function decomposeBucket(
  input: DecomposeBucketInput
): Promise<BucketDecompositionSuggestion[]> {
  const bucketTitle = input.bucketTitle.trim();
  if (!bucketTitle) {
    throw new Error("버킷 제목이 비어 있습니다.");
  }

  const existingChapterTitles = (input.existingChapterTitles ?? [])
    .map((title) => title.trim())
    .filter(Boolean)
    .slice(0, 12);

  const personalityHint = buildPersonalityHint(input.profile?.personality_type);
  const paceHint = buildPaceHint(input.profile?.pace_type);
  const horizonLabel = HORIZON_LABELS[input.horizon];

  const prompt = `당신은 slowgoes 앱의 버킷 분해 코치입니다.
사용자의 큰 삶의 장면(버킷)을 챕터 단위 목표로 나누고, 각 챕터마다 심리적 부담이 낮은 첫 행동을 제안하세요.

입력 정보:
- 버킷: "${bucketTitle}"
- 시간 지평: ${horizonLabel}
- 성향: ${input.profile?.personality_type ?? "미정"}
- 페이스: ${input.profile?.pace_type ?? "미정"}
- 기존 챕터 제목: ${existingChapterTitles.length > 0 ? existingChapterTitles.join(" | ") : "없음"}

성향/페이스 적용 규칙:
- ${personalityHint}
- ${paceHint}

출력 규칙:
- 2~4개의 챕터를 제안
- 챕터 제목은 중복 없이 구체적인 실행 문장으로 작성
- 챕터 설명은 한 문장(20~60자)
- firstAction은 지금 당장 시작 가능한 가장 작은 행동(5~20분)
- 전체 문장은 한국어
- 기존 챕터 제목과 겹치는 제안은 피함

반드시 아래 JSON 배열 형식으로만 응답하세요:
[
  {
    "chapterTitle": "챕터 제목",
    "chapterDescription": "챕터 설명",
    "firstAction": "부담이 낮은 첫 행동"
  }
]`;

  let parsed: unknown;
  try {
    const result = await geminiModel.generateContent(prompt);
    parsed = parseJsonResponse(result.response.text());
  } catch (error) {
    throw mapGeminiError(error);
  }

  const suggestions = normalizeBucketSuggestions(
    parsed,
    bucketTitle,
    input.horizon,
    existingChapterTitles
  );

  if (suggestions.length === 0) {
    throw new Error("버킷 분해 결과를 만들지 못했습니다.");
  }

  return suggestions;
}
