// 공통 유틸리티 함수

import type { Difficulty } from "@/types";

/**
 * 클래스명 조건부 결합
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 분 단위를 "X시간 Y분" 형식으로 변환
 * - 0 → "0분"
 * - 45 → "45분"
 * - 60 → "1시간"
 * - 90 → "1시간 30분"
 * - 음수/undefined/NaN → "0분"
 */
export function formatMinutes(minutes: number | undefined | null): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "0분";
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}시간`;
  return `${hours}시간 ${remainingMinutes}분`;
}

// 난이도별 색상 설정 (쉬움: 🟢, 보통: 🟡, 어려움: 🔴)
export const difficultyConfig = {
  easy: {
    label: "쉬움",
    color: "#22C55E",
    tailwind: "text-green-500 bg-green-50",
  },
  medium: {
    label: "보통",
    color: "#EAB308",
    tailwind: "text-yellow-500 bg-yellow-50",
  },
  hard: {
    label: "어려움",
    color: "#EF4444",
    tailwind: "text-red-500 bg-red-50",
  },
} as const;

/**
 * 난이도에 해당하는 설정(라벨, 색상, Tailwind 클래스) 반환
 */
export function getDifficultyConfig(difficulty: Difficulty) {
  return difficultyConfig[difficulty];
}
