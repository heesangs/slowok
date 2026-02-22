"use client";

// 과제 입력 폼 — 제목 필수 + 메모·단계 수·목표 시간·마감일 선택 확장 폼

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TaskInputData, UserContext } from "@/types";

// userContext별 placeholder 맵
const PLACEHOLDERS: Record<UserContext | "default", string> = {
  student: "예: 수학 중간고사 준비",
  university: "예: 경영학 기말 레포트",
  work: "예: 신규 기능 디자인 시안 제작",
  personal: "예: '원씽' 읽고 독서노트 쓰기",
  default: "예: 이번 주에 끝내고 싶은 일",
};

// 단계 수 칩 옵션 (undefined = AI 추천)
const SUBTASK_COUNT_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: "AI 추천", value: undefined },
  { label: "3", value: 3 },
  { label: "5", value: 5 },
  { label: "7", value: 7 },
  { label: "10", value: 10 },
];

// 목표 시간 칩 옵션 (undefined = AI 추천)
const DURATION_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: "AI 추천", value: undefined },
  { label: "30분", value: 30 },
  { label: "1시간", value: 60 },
  { label: "2시간", value: 120 },
  { label: "3시간+", value: 180 },
];

interface TaskInputFormProps {
  onSubmit: (data: TaskInputData) => void;
  isLoading: boolean;
  userContext?: UserContext[];
}

export function TaskInputForm({ onSubmit, isLoading, userContext }: TaskInputFormProps) {
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [memo, setMemo] = useState("");
  const [subtaskCount, setSubtaskCount] = useState<number | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState("");

  // userContext 첫 번째 값으로 placeholder 결정
  const firstContext = userContext?.[0];
  const placeholder = firstContext
    ? PLACEHOLDERS[firstContext]
    : PLACEHOLDERS["default"];

  // 오늘 날짜 (min 값용)
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onSubmit({
      title: trimmed,
      memo: memo.trim() || undefined,
      desiredSubtaskCount: subtaskCount,
      targetDurationMinutes: duration,
      dueDate: dueDate || undefined,
    });

    // 확장 폼 접기
    setExpanded(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 제목 입력 */}
      <Input
        id="task-title"
        label="할 일 입력"
        placeholder={placeholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
        autoFocus
      />

      {/* 확장 토글 버튼 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground/80 transition-colors w-fit"
      >
        <span>더 자세히 알려주기</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : "rotate-0"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 확장 영역 */}
      <div
        className={`flex flex-col gap-4 overflow-hidden transition-all duration-200 ease-in-out ${
          expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {/* 메모 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-memo" className="text-sm font-medium">
            메모 <span className="text-foreground/40 font-normal">(선택)</span>
          </label>
          <div className="relative">
            <textarea
              id="task-memo"
              rows={3}
              maxLength={500}
              placeholder="과제에 대해 더 자세히 설명해주세요. AI가 더 정확하게 분석할 수 있어요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none disabled:opacity-50"
            />
            <span className="absolute bottom-2 right-3 text-xs text-foreground/40">
              {memo.length}/500
            </span>
          </div>
        </div>

        {/* 단계 수 칩 */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            단계 수 <span className="text-foreground/40 font-normal">(선택)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {SUBTASK_COUNT_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                disabled={isLoading}
                onClick={() => setSubtaskCount(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  subtaskCount === opt.value
                    ? "bg-primary text-white"
                    : "border border-border bg-background text-foreground/70 hover:border-primary/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 목표 시간 칩 */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            목표 시간 <span className="text-foreground/40 font-normal">(선택)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                disabled={isLoading}
                onClick={() => setDuration(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  duration === opt.value
                    ? "bg-primary text-white"
                    : "border border-border bg-background text-foreground/70 hover:border-primary/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 마감일 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-due-date" className="text-sm font-medium">
            마감일 <span className="text-foreground/40 font-normal">(선택)</span>
          </label>
          <input
            id="task-due-date"
            type="date"
            min={today}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
        </div>
      </div>

      {/* 제출 버튼 */}
      <Button type="submit" isLoading={isLoading} disabled={!title.trim()}>
        {isLoading ? "분석 중..." : "분석하기"}
      </Button>
    </form>
  );
}
