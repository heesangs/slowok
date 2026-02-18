"use client";

// 하위 과제 체크 아이템 — 체크박스 토글 + 난이도 뱃지 + 예상/실제 시간

import { useState } from "react";
import { cn, getDifficultyConfig, formatMinutes } from "@/lib/utils";
import type { Subtask } from "@/types";

interface SubtaskCheckItemProps {
  subtask: Subtask;
  onToggle: (subtaskId: string) => void;
  onUpdateMinutes: (subtaskId: string, minutes: number) => void;
}

export function SubtaskCheckItem({
  subtask,
  onToggle,
  onUpdateMinutes,
}: SubtaskCheckItemProps) {
  const isCompleted = subtask.status === "completed";
  const config = getDifficultyConfig(subtask.difficulty);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [localMinutes, setLocalMinutes] = useState(subtask.actual_minutes ?? 0);

  // 실제 시간 저장
  const handleSaveMinutes = () => {
    if (localMinutes >= 0) {
      onUpdateMinutes(subtask.id, localMinutes);
    }
    setShowTimeInput(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-foreground/10 p-3 transition-colors",
        isCompleted && "bg-foreground/[0.02] border-foreground/5",
        subtask.depth > 0 && "border-foreground/5"
      )}
    >
      {/* 체크박스 행 */}
      <button
        onClick={() => onToggle(subtask.id)}
        className="flex items-start gap-3 w-full text-left min-h-[44px] cursor-pointer"
      >
        {/* 체크박스 */}
        <div
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
            isCompleted
              ? "border-green-500 bg-green-500"
              : "border-foreground/30"
          )}
        >
          {isCompleted && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6L5 8.5L9.5 4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* 제목 + 뱃지 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium",
                isCompleted && "line-through text-foreground/40"
              )}
            >
              {subtask.title}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                config.tailwind
              )}
            >
              {config.label}
            </span>
          </div>

          {/* 예상 시간 + 실제 시간 */}
          <div className="flex items-center gap-2 mt-1 text-xs text-foreground/40">
            <span>예상 {formatMinutes(subtask.estimated_minutes)}</span>
            {subtask.actual_minutes != null && subtask.actual_minutes > 0 && (
              <>
                <span>·</span>
                <span>실제 {formatMinutes(subtask.actual_minutes)}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* 완료 시 실제 소요 시간 입력 */}
      {isCompleted && (
        <div className="mt-2 ml-8">
          {!showTimeInput ? (
            <button
              onClick={() => setShowTimeInput(true)}
              className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors cursor-pointer"
            >
              {subtask.actual_minutes ? "소요 시간 수정" : "실제 소요 시간 입력"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocalMinutes(Math.max(0, localMinutes - 5))}
                className="flex items-center justify-center w-7 h-7 rounded border border-foreground/20 text-foreground/60 hover:bg-foreground/5 text-xs cursor-pointer"
              >
                −
              </button>
              <span className="text-xs font-medium w-12 text-center">
                {formatMinutes(localMinutes)}
              </span>
              <button
                onClick={() => setLocalMinutes(localMinutes + 5)}
                className="flex items-center justify-center w-7 h-7 rounded border border-foreground/20 text-foreground/60 hover:bg-foreground/5 text-xs cursor-pointer"
              >
                +
              </button>
              <button
                onClick={handleSaveMinutes}
                className="text-xs font-medium text-green-500 hover:text-green-600 ml-1 cursor-pointer"
              >
                저장
              </button>
              <button
                onClick={() => setShowTimeInput(false)}
                className="text-xs text-foreground/40 hover:text-foreground/60 cursor-pointer"
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
