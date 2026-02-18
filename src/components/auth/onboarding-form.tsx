"use client";

// 온보딩 폼 — 학년, 과목, 자기 수준 설정

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveProfileAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { useState } from "react";

const GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"];

const SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "기타"];

const SELF_LEVELS = [
  { value: "low", label: "느긋한 편", description: "천천히, 꼼꼼하게" },
  { value: "medium", label: "보통", description: "적당한 속도로" },
  { value: "high", label: "빠른 편", description: "빠르게, 효율적으로" },
] as const;

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [grade, setGrade] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selfLevel, setSelfLevel] = useState<string>("medium");

  function toggleSubject(subject: string) {
    setSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);

    // 폼에 숨겨진 값 추가
    formData.set("grade", grade);
    formData.set("subjects", JSON.stringify(subjects));
    formData.set("self_level", selfLevel);

    if (!grade) {
      setError("학년을 선택해주세요.");
      return;
    }

    if (subjects.length === 0) {
      setError("과목을 하나 이상 선택해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await saveProfileAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect는 에러로 throw되므로 무시
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* 닉네임 */}
      <Input
        id="display_name"
        name="display_name"
        label="닉네임"
        placeholder="닉네임을 입력하세요"
        required
        autoComplete="nickname"
      />

      {/* 학년 선택 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground/70">학년</label>
        <div className="grid grid-cols-3 gap-2">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrade(g)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                grade === g
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:bg-foreground/5"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 과목 선택 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground/70">
          주요 과목 (복수 선택)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSubject(s)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                subjects.includes(s)
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:bg-foreground/5"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 자기 수준 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground/70">
          나의 공부 속도
        </label>
        <div className="flex flex-col gap-2">
          {SELF_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setSelfLevel(level.value)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer",
                selfLevel === level.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:bg-foreground/5"
              )}
            >
              <span className="text-sm font-medium">{level.label}</span>
              <span
                className={cn(
                  "text-xs ml-2",
                  selfLevel === level.value
                    ? "text-background/70"
                    : "text-foreground/50"
                )}
              >
                {level.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <Button type="submit" isLoading={isLoading} className="w-full">
        시작하기
      </Button>
    </form>
  );
}
