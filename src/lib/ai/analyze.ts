// AI 할 일 분석 — Gemini API로 하위 과제 분해, 난이도/시간 제안

import { geminiModel } from "./gemini";
import type { AISubtaskSuggestion, Profile } from "@/types";

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

// AI 분석 힌트 (선택 컨텍스트)
interface TaskAnalysisHints {
  memo?: string;
  desiredSubtaskCount?: number;
  targetDurationMinutes?: number;
  dueDate?: string;
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
