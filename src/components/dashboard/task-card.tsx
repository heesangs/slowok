"use client";

// 대시보드 과제 카드 — 과제 요약 정보 표시

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMinutes, difficultyConfig } from "@/lib/utils";
import type { TaskWithSubtasks, Difficulty } from "@/types";

interface TaskCardProps {
  task: TaskWithSubtasks;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function TaskCard({ task, onDelete, isDeleting }: TaskCardProps) {
  const router = useRouter();
  const isCompleted = task.status === "completed";
  const subtasks = task.subtasks ?? [];
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 3초 후 확인 상태 자동 리셋
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  // 난이도별 하위 과제 수 계산
  const difficultyCounts = subtasks.reduce(
    (acc, s) => {
      acc[s.difficulty] = (acc[s.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<Difficulty, number>
  );

  // 완료된 하위 과제 수
  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="relative">
      {/* 카드 클릭 → 상세 페이지 이동 */}
      <div
        onClick={() => router.push(`/tasks/${task.id}`)}
        className="cursor-pointer"
      >
        <Card
          className={cn(
            "transition-colors active:bg-foreground/5",
            isCompleted && "opacity-60"
          )}
        >
          <CardContent>
            {/* 과제 제목 — 삭제 버튼 공간 확보를 위해 오른쪽 패딩 추가 */}
            <h3
              className={cn(
                "font-semibold text-base pr-8",
                isCompleted && "line-through text-foreground/40"
              )}
            >
              {task.title}
            </h3>

            {/* 난이도 뱃지 */}
            {totalCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {(["easy", "medium", "hard"] as const).map((diff) => {
                  const count = difficultyCounts[diff];
                  if (!count) return null;
                  const config = difficultyConfig[diff];
                  return (
                    <span
                      key={diff}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        config.tailwind
                      )}
                    >
                      {config.label} {count}
                    </span>
                  );
                })}
              </div>
            )}

            {/* 진행 바 + 시간 */}
            <div className="mt-3 flex items-center gap-3">
              {/* 진행 바 */}
              {totalCount > 0 && (
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/60 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-foreground/50 shrink-0">
                    {completedCount}/{totalCount}
                  </span>
                </div>
              )}

              {/* 예상 시간 */}
              <span className="text-xs text-foreground/50 shrink-0">
                {formatMinutes(task.total_estimated_minutes)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 삭제 버튼 — absolute로 우상단 배치 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirmDelete) {
            onDelete();
            setConfirmDelete(false);
          } else {
            setConfirmDelete(true);
          }
        }}
        disabled={isDeleting}
        className={cn(
          "absolute top-3 right-3 flex items-center justify-center min-w-[28px] h-7 rounded transition-colors",
          confirmDelete
            ? "text-red-500 font-medium text-xs px-1.5"
            : "text-foreground/30 hover:text-red-500"
        )}
        aria-label="할일 삭제"
      >
        {isDeleting ? (
          // 삭제 중 스피너
          <svg
            className="animate-spin w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : confirmDelete ? (
          // 확인 상태 — 빨간 "삭제" 텍스트
          "삭제"
        ) : (
          // 기본 상태 — 휴지통 아이콘
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        )}
      </button>
    </div>
  );
}
