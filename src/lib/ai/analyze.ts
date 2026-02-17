// AI 과제 분석 — Gemini API로 하위 과제 분해, 난이도/시간 제안

import { geminiModel } from "./gemini";
import type { AISubtaskSuggestion, Profile } from "@/types";

// JSON 응답에서 마크다운 코드펜스 제거
function parseJsonResponse(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// 프로필 기반 시스템 프롬프트 생성
function buildProfileContext(profile: Profile | null): string {
  if (!profile) return "학생 정보가 없습니다.";
  const parts: string[] = [];
  if (profile.grade) parts.push(`학년: ${profile.grade}`);
  if (profile.subjects?.length) parts.push(`주요 과목: ${profile.subjects.join(", ")}`);
  if (profile.self_level) {
    const levelLabel = { low: "하", medium: "중", high: "상" }[profile.self_level];
    parts.push(`자기 평가 수준: ${levelLabel}`);
  }
  return parts.length > 0 ? parts.join("\n") : "학생 정보가 없습니다.";
}

/**
 * 과제를 3~7개 하위 과제로 분해
 */
export async function analyzeTask(
  taskTitle: string,
  profile: Profile | null
): Promise<AISubtaskSuggestion[]> {
  const prompt = `당신은 한국 학생의 학습을 돕는 AI 튜터입니다.

학생 정보:
${buildProfileContext(profile)}

다음 과제를 3~7개의 하위 과제로 분해해주세요.
각 하위 과제에 대해 난이도(easy/medium/hard)와 예상 소요 시간(분)을 제안해주세요.

규칙:
- 쉬운 과제는 넉넉한 시간이 아니라 빠르게 처리할 수 있도록 짧은 시간을 제안
- 어려운 과제는 충분히 여유로운 시간을 제안 (서두르지 않도록)
- 학생의 수준을 고려하여 시간을 조정
- 최소 5분, 최대 120분 범위

과제: "${taskTitle}"

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  { "title": "하위 과제 제목", "difficulty": "easy|medium|hard", "estimated_minutes": 숫자 }
]`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseJsonResponse(text) as AISubtaskSuggestion[];

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
  const prompt = `당신은 한국 학생의 학습을 돕는 AI 튜터입니다.

학생 정보:
${buildProfileContext(profile)}

상위 과제: "${taskTitle}"
분해할 하위 과제: "${parentTitle}"

이 하위 과제를 2~4개의 더 작은 단계로 분해해주세요.
각 단계에 대해 난이도(easy/medium/hard)와 예상 소요 시간(분)을 제안해주세요.

규칙:
- 쉬운 단계는 짧은 시간, 어려운 단계는 여유로운 시간
- 학생의 수준을 고려
- 최소 5분, 최대 60분 범위

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  { "title": "단계 제목", "difficulty": "easy|medium|hard", "estimated_minutes": 숫자 }
]`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseJsonResponse(text) as AISubtaskSuggestion[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI 응답이 올바르지 않습니다.");
  }

  return parsed.map((item) => ({
    title: String(item.title),
    difficulty: (["easy", "medium", "hard"].includes(item.difficulty) ? item.difficulty : "medium") as AISubtaskSuggestion["difficulty"],
    estimated_minutes: Math.max(5, Math.min(60, Math.round(Number(item.estimated_minutes) || 10))),
  }));
}
